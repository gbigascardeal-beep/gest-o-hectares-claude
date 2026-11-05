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
  source: "google" | "osm";
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


// ======================================================================
// Fonte gratuita: OpenStreetMap (Nominatim para a cidade + Overpass para as empresas)
// ======================================================================

export const OSM_MAX_RADIUS_KM = 100;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

const userAgent = () =>
  `GestaoHectares/1.0 (+${process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "sistema interno de estoque e compras"})`;

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "para", "com", "em", "por", "na", "no", "nas", "nos", "uma", "perto", "proximo"]);

function stem(word: string): string {
  if (word.length <= 4) return word;
  let result = word;
  if (word.endsWith("coes")) result = word.slice(0, -3); // construcoes -> construc
  else if (word.endsWith("cao")) result = word.slice(0, -2); // construcao -> construc
  else if (word.endsWith("ais")) result = word.slice(0, -3) + "al"; // materiais -> material
  else if (word.endsWith("ens")) result = word.slice(0, -3) + "em"; // ferragens -> ferragem
  else if (word.endsWith("s")) result = word.slice(0, -1);
  return result.length >= 4 ? result : word; // evita pedaços curtos demais (ex.: "rac")
}

/** Palavras úteis da busca, sem acento e no singular (para comparar com o nome das empresas). */
export function keywordWords(keyword: string): string[] {
  const words = normalize(keyword)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map(stem);
  return Array.from(new Set(words));
}

const ACCENTS: Record<string, string> = {
  a: "[aAáÁàÀâÂãÃäÄ]", e: "[eEéÉèÈêÊëË]", i: "[iIíÍìÌîÎïÏ]", o: "[oOóÓòÒôÔõÕöÖ]", u: "[uUúÚùÙûÛüÜ]", c: "[cCçÇ]",
};
/** Expressão que casa a palavra com ou sem acento. */
export function accentRegex(word: string): string {
  return word.replace(/[^a-z0-9]/g, "").split("").map((ch) => ACCENTS[ch] ?? ch).join("");
}

type TagSpec = { key: string; values: string[] };
const CATEGORY_RULES: { triggers: string[]; tags: TagSpec[] }[] = [
  { triggers: ["construc", "cimento", "tijolo", "areia", "brita", "argamassa", "ferrag", "ferrament", "alvenaria", "telha"],
    tags: [{ key: "shop", values: ["doityourself", "hardware", "building_materials", "trade"] }] },
  { triggers: ["eletric", "eletrico", "fio", "cabo", "lampada", "iluminacao"],
    tags: [{ key: "shop", values: ["electrical", "lighting", "doityourself", "hardware"] }] },
  { triggers: ["hidraul", "encanamento", "tubo", "conexo", "registro", "caixa dagua"],
    tags: [{ key: "shop", values: ["doityourself", "hardware", "trade"] }] },
  { triggers: ["tinta", "pintura", "verniz"], tags: [{ key: "shop", values: ["paint", "doityourself"] }] },
  { triggers: ["madeir", "compensado", "mdf"], tags: [{ key: "shop", values: ["trade", "doityourself"] }] },
  { triggers: ["agro", "agricol", "semente", "defensivo", "insumo", "fertiliz", "racao", "veterinari", "pecuari", "adubo"],
    tags: [{ key: "shop", values: ["agrarian", "farm", "garden_centre", "pet", "country_store"] }] },
  { triggers: ["maquina", "trator", "implemento", "colheitadeira"], tags: [{ key: "shop", values: ["agrarian", "trade", "machinery"] }] },
  { triggers: ["autopeca", "peca", "pneu", "borracharia", "oficina", "mecanic", "veiculo", "caminhao"],
    tags: [{ key: "shop", values: ["car_parts", "tyres", "car_repair", "motorcycle_repair", "car"] }] },
  { triggers: ["combustivel", "posto", "diesel", "gasolina"], tags: [{ key: "amenity", values: ["fuel"] }] },
  { triggers: ["supermercado", "mercado", "atacado", "atacadista", "mercearia"],
    tags: [{ key: "shop", values: ["supermarket", "wholesale", "convenience", "greengrocer"] }] },
  { triggers: ["farmacia", "medicament", "drogaria"], tags: [{ key: "amenity", values: ["pharmacy"] }, { key: "shop", values: ["chemist"] }] },
  { triggers: ["papelaria", "escritorio", "copiadora"], tags: [{ key: "shop", values: ["stationery", "copyshop", "office_supplies"] }] },
  { triggers: ["informatica", "computador", "eletronic", "celular"], tags: [{ key: "shop", values: ["computer", "electronics", "mobile_phone"] }] },
  { triggers: ["movel", "moveis", "mobiliario"], tags: [{ key: "shop", values: ["furniture"] }] },
  { triggers: ["roupa", "uniforme", "epi ", "vestuario"], tags: [{ key: "shop", values: ["clothes", "workwear", "uniform"] }] },
  { triggers: ["vidro", "vidrac"], tags: [{ key: "shop", values: ["glaziery"] }, { key: "craft", values: ["glaziery"] }] },
  { triggers: ["limpeza", "descartave", "higiene"], tags: [{ key: "shop", values: ["cleaning", "chemist", "variety_store", "wholesale"] }] },
  { triggers: ["eletrodomestic"], tags: [{ key: "shop", values: ["appliance", "electronics"] }] },
  { triggers: ["acougue", "carne"], tags: [{ key: "shop", values: ["butcher"] }] },
  { triggers: ["padaria", "pao"], tags: [{ key: "shop", values: ["bakery"] }] },
];

export function tagSpecsFor(keyword: string): TagSpec[] {
  const text = ` ${normalize(keyword)} `;
  const merged = new Map<string, Set<string>>();
  for (const rule of CATEGORY_RULES) {
    if (!rule.triggers.some((t) => text.includes(t))) continue;
    for (const tag of rule.tags) {
      const set = merged.get(tag.key) ?? new Set<string>();
      tag.values.forEach((v) => set.add(v));
      merged.set(tag.key, set);
    }
  }
  return Array.from(merged, ([key, values]) => ({ key, values: Array.from(values) }));
}

export function buildOverpassQuery(keyword: string, center: LatLng, radiusKm: number): string {
  const around = `(around:${Math.round(radiusKm * 1000)},${center.lat.toFixed(5)},${center.lng.toFixed(5)})`;
  let words = keywordWords(keyword);
  const specs = tagSpecsFor(keyword);
  if (words.length === 0 && specs.length === 0) words = [normalize(keyword).replace(/[^a-z0-9]/g, "")].filter(Boolean);
  if (words.length === 0 && specs.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Digite uma palavra-chave com letras (ex.: materiais de construção)." });
  }

  const parts: string[] = [];
  for (const spec of specs) parts.push(`nwr["${spec.key}"~"^(${spec.values.join("|")})$"]${around};`);
  for (const word of words) {
    const re = accentRegex(word);
    for (const key of ["shop", "office", "craft", "amenity"]) parts.push(`nwr["${key}"]["name"~"${re}",i]${around};`);
  }
  return `[out:json][timeout:20];(${parts.join("")});out center tags 200;`;
}

type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

function httpUrlOrNull(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseOverpassElements(elements: OsmElement[], origin: LatLng, keyword: string, radiusKm: number): PlaceResult[] {
  const specs = tagSpecsFor(keyword);
  const words = keywordWords(keyword);
  const seen = new Set<string>();
  const scored: { score: number; place: PlaceResult }[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;

    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distanceKm = Math.round(haversineKm(origin, { lat, lng: lon }) * 10) / 10;
    if (distanceKm > radiusKm) continue;

    const nameNorm = normalize(name);
    const tagHit = specs.some((s) => s.values.includes(tags[s.key]));
    const nameHits = words.filter((w) => nameNorm.includes(w)).length;

    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
    const address = [street, tags["addr:suburb"] ?? tags["addr:neighbourhood"], tags["addr:city"]].filter(Boolean).join(" · ") || null;
    const phoneRaw = tags.phone ?? tags["contact:phone"] ?? tags.mobile ?? tags["contact:mobile"];

    scored.push({
      score: (tagHit ? 2 : 0) + nameHits,
      place: {
        id: key,
        name,
        address,
        phone: phoneRaw ? phoneRaw.split(";")[0].trim() : null,
        website: httpUrlOrNull(tags.website ?? tags["contact:website"] ?? tags.url),
        rating: null,
        ratingCount: null,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
        distanceKm,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score || (a.place.distanceKm ?? 0) - (b.place.distanceKm ?? 0));
  return scored.map((item) => item.place);
}

// A Nominatim pede no máximo 1 consulta por segundo para todo o sistema.
let nominatimChain: Promise<unknown> = Promise.resolve();
function throttledNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimChain.then(async () => {
    const result = await task();
    await sleep(1100);
    return result;
  });
  nominatimChain = run.catch(() => undefined);
  return run;
}

async function geocodeCityOsm(city: string) {
  const key = `osm:${city.trim().toLowerCase()}`;
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: `${city}, Brasil`, format: "jsonv2", limit: "1", countrycodes: "br", "accept-language": "pt-BR" })}`;
  const data = await throttledNominatim(async () => {
    try {
      const response = await fetch(url, { headers: { "User-Agent": userAgent() }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as { lat: string; lon: string }[];
    } catch (error) {
      console.error("[Mapas] Falha ao localizar a cidade:", error);
      throw new TRPCError({ code: "BAD_GATEWAY", message: "O serviço de mapas gratuito não respondeu. Tente de novo em instantes." });
    }
  });

  const first = data?.[0];
  if (!first) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Não encontrei a cidade "${city}". Tente no formato "Dourados, MS".` });
  }
  const found = { point: { lat: Number(first.lat), lng: Number(first.lon) }, label: city.trim() };
  geocodeCache.set(key, found);
  return found;
}

async function callOverpass(query: string): Promise<OsmElement[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent() },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(28000),
      });
      if (!response.ok) {
        console.warn(`[Mapas] ${endpoint} respondeu ${response.status}`);
        continue;
      }
      const json = (await response.json()) as { elements?: OsmElement[]; remark?: string };
      if (json.remark && /runtime error/i.test(json.remark) && !json.elements?.length) {
        console.warn(`[Mapas] ${endpoint}: ${json.remark}`);
        continue;
      }
      return json.elements ?? [];
    } catch (error) {
      console.warn(`[Mapas] ${endpoint} falhou:`, error);
    }
  }
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message: "O serviço de mapas gratuito está ocupado agora. Aguarde um minuto e tente de novo (ou reduza o alcance).",
  });
}

async function searchOsm(keyword: string, city: string, radiusKm: number): Promise<PlaceSearchOutput> {
  const origin = await geocodeCityOsm(city);
  const elements = await callOverpass(buildOverpassQuery(keyword, origin.point, radiusKm));
  const all = parseOverpassElements(elements, origin.point, keyword, radiusKm);
  return { source: "osm", origin: origin.label, results: all.slice(0, MAX_RESULTS), totalFound: all.length };
}

// ======================================================================
// Escolha da fonte: com chave do Google usa o Google; sem chave usa o mapa gratuito
// ======================================================================

export function getSearchInfo() {
  const provider = ENV.googlePlacesApiKey ? ("google" as const) : ("osm" as const);
  return { provider, maxRadiusKm: provider === "osm" ? OSM_MAX_RADIUS_KM : 500, allowNationwide: provider === "google" };
}

const searchCache = new Map<string, { at: number; data: PlaceSearchOutput }>();

async function searchGoogle(keyword: string, city: string | undefined, radiusKm: number | null): Promise<PlaceSearchOutput> {
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
    source: "google",
    origin: origin?.label ?? null,
    results: all.slice(0, MAX_RESULTS),
    totalFound: all.length,
  };

  return output;
}

export async function searchSuppliers(
  input: { keyword: string; city?: string; radiusKm?: number | null },
  userId: number
): Promise<PlaceSearchOutput> {
  const keyword = input.keyword.trim();
  const city = input.city?.trim() || undefined;
  const radiusKm = input.radiusKm ?? null;
  const { provider } = getSearchInfo();

  if (provider === "osm") {
    if (!city) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a cidade de referência." });
    if (radiusKm === null || radiusKm > OSM_MAX_RADIUS_KM) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Na busca gratuita o alcance máximo é de ${OSM_MAX_RADIUS_KM} km.` });
    }
  } else if (radiusKm && !city) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a cidade de referência para buscar por distância." });
  }

  const cacheKey = JSON.stringify([provider, keyword.toLowerCase(), city?.toLowerCase() ?? null, radiusKm]);
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  assertWithinQuota(userId);

  const output = provider === "osm" ? await searchOsm(keyword, city!, radiusKm!) : await searchGoogle(keyword, city, radiusKm);

  if (searchCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(cacheKey, { at: Date.now(), data: output });
  return output;
}
