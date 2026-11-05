import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type LatLng = { lat: number; lng: number };

export type PlaceResult = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
  distanceKm: number | null;
};

export type PlaceSearchOutput = {
  origin: string | null;
  results: PlaceResult[];
  totalFound: number;
};

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const MAX_RESULTS = 12;
const SEARCHES_PER_HOUR = 30;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Distância em linha reta (km) entre dois pontos. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Retângulo que contém o círculo de busca (o Google só aceita retângulo como restrição). */
export function boundingBox(center: LatLng, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(Math.cos(toRad(center.lat)), 0.01));
  return {
    low: { latitude: clamp(center.lat - dLat, -90, 90), longitude: clamp(center.lng - dLng, -180, 180) },
    high: { latitude: clamp(center.lat + dLat, -90, 90), longitude: clamp(center.lng + dLng, -180, 180) },
  };
}

async function callPlaces(body: Record<string, unknown>, fieldMask: string): Promise<any> {
  if (!ENV.googlePlacesApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "A busca de fornecedores ainda não foi ativada. O administrador precisa cadastrar a chave GOOGLE_PLACES_API_KEY no Railway.",
    });
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": ENV.googlePlacesApiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    console.error("[Places] Falha de rede ou tempo esgotado:", error);
    throw new TRPCError({ code: "BAD_GATEWAY", message: "O Google não respondeu a tempo. Tente de novo em instantes." });
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 600);
    console.error(`[Places] Erro ${response.status}:`, detail);
    if (response.status === 400 && /API key not valid/i.test(detail)) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "A chave do Google é inválida. Confira a GOOGLE_PLACES_API_KEY." });
    }
    if (response.status === 403) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "O Google recusou a chave. Confira se a \"Places API (New)\" está ativada e se a cobrança do projeto está ligada.",
      });
    }
    if (response.status === 429) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Limite de buscas do Google atingido. Tente mais tarde." });
    }
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Não foi possível consultar o Google agora." });
  }
  return response.json();
}

const geocodeCache = new Map<string, { point: LatLng; label: string }>();

async function geocodeCity(city: string) {
  const key = city.trim().toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const data = await callPlaces(
    { textQuery: `${city}, Brasil`, pageSize: 1, languageCode: "pt-BR", regionCode: "BR" },
    "places.location,places.formattedAddress"
  );
  const place = data?.places?.[0];
  if (!place?.location) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Não encontrei a cidade "${city}". Tente no formato "Dourados, MS".` });
  }
  const found = {
    point: { lat: place.location.latitude as number, lng: place.location.longitude as number },
    label: (place.formattedAddress as string | undefined) ?? city,
  };
  geocodeCache.set(key, found);
  return found;
}

const usage = new Map<number, number[]>();
function assertWithinQuota(userId: number) {
  const now = Date.now();
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= SEARCHES_PER_HOUR) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Você fez muitas buscas nesta hora. Aguarde um pouco e tente de novo." });
  }
  recent.push(now);
  usage.set(userId, recent);
}

const searchCache = new Map<string, { at: number; data: PlaceSearchOutput }>();

export async function searchSuppliers(
  input: { keyword: string; city?: string; radiusKm?: number | null },
  userId: number
): Promise<PlaceSearchOutput> {
  const keyword = input.keyword.trim();
  const city = input.city?.trim() || undefined;
  const radiusKm = input.radiusKm ?? null;

  if (radiusKm && !city) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a cidade de referência para buscar por distância." });
  }

  const cacheKey = JSON.stringify([keyword.toLowerCase(), city?.toLowerCase() ?? null, radiusKm]);
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  assertWithinQuota(userId);

  const origin = city ? await geocodeCity(city) : null;

  const body: Record<string, unknown> = { textQuery: keyword, languageCode: "pt-BR", regionCode: "BR", pageSize: 20 };
  if (origin && radiusKm) {
    body.locationRestriction = { rectangle: boundingBox(origin.point, radiusKm) };
  } else if (origin) {
    body.locationBias = { circle: { center: { latitude: origin.point.lat, longitude: origin.point.lng }, radius: 50000 } };
  }

  const data = await callPlaces(
    body,
    [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.nationalPhoneNumber",
      "places.websiteUri",
      "places.rating",
      "places.userRatingCount",
      "places.googleMapsUri",
      "places.businessStatus",
    ].join(",")
  );

  const all: PlaceResult[] = ((data?.places ?? []) as any[])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => {
      const point: LatLng | null = p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null;
      return {
        id: String(p.id),
        name: p.displayName?.text ?? "Sem nome",
        address: p.formattedAddress ?? null,
        phone: p.nationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        rating: typeof p.rating === "number" ? p.rating : null,
        ratingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
        mapsUrl: p.googleMapsUri ?? null,
        distanceKm: origin && point ? Math.round(haversineKm(origin.point, point) * 10) / 10 : null,
      };
    })
    // o retângulo tem "cantos" fora do círculo: remove o que passou do alcance pedido
    .filter((p) => !(radiusKm && p.distanceKm !== null && p.distanceKm > radiusKm));

  const output: PlaceSearchOutput = {
    origin: origin?.label ?? null,
    results: all.slice(0, MAX_RESULTS),
    totalFound: all.length,
  };

  if (searchCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(cacheKey, { at: Date.now(), data: output });
  return output;
}
