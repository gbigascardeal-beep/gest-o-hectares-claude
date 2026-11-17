/**
 * Gerador de PDF simples e sem dependências (texto e tabelas), usado nos Relatórios.
 * Usa as fontes padrão do PDF (Helvetica), então o arquivo é pequeno e abre em qualquer leitor.
 * Texto grande e em negrito de propósito: facilita a leitura.
 */

// Largura de cada caractere (em 1/1000 do tamanho da fonte), códigos 32 a 255 (Windows-1252)
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761,
  556, 556, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556,
  556, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 556, 500, 667,
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761,
  556, 556, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 556, 611, 556,
  556, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 556, 500, 667,
  278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
  611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
];

// Windows-1252: caracteres 128–159 que não existem em Latin-1
const CP1252_SPECIAL: Record<string, number> = {
  "€": 128, "‚": 130, "ƒ": 131, "„": 132, "…": 133, "†": 134, "‡": 135, "ˆ": 136, "‰": 137, "Š": 138, "‹": 139, "Œ": 140,
  "Ž": 142, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "˜": 152, "™": 153, "š": 154, "›": 155,
  "œ": 156, "ž": 158, "Ÿ": 159,
};

/** Converte um caractere para o byte Windows-1252 (ou "?" se não existir). */
function toByte(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code === 160) return 32;
  if (code >= 32 && code <= 126) return code;
  if (code >= 161 && code <= 255) return code;
  if (CP1252_SPECIAL[ch] !== undefined) return CP1252_SPECIAL[ch];
  if (code === 9 || code === 10 || code === 13) return 32;
  return 63;
}

type Font = "regular" | "bold";

function charWidth(byte: number, font: Font): number {
  const table = font === "bold" ? HELVETICA_BOLD : HELVETICA;
  return table[byte - 32] ?? 556;
}

export function textWidth(text: string, size: number, font: Font = "regular"): number {
  let total = 0;
  for (const ch of text) total += charWidth(toByte(ch), font);
  return (total * size) / 1000;
}

/** Quebra o texto em linhas que cabem em `maxWidth`. Palavras longas demais são cortadas. */
export function wrapText(text: string, size: number, maxWidth: number, font: Font = "regular"): string[] {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of clean.split(" ")) {
    let piece = word;
    // palavra maior que a coluna: corta em pedaços
    while (textWidth(piece, size, font) > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let cut = piece.length;
      while (cut > 1 && textWidth(piece.slice(0, cut), size, font) > maxWidth) cut--;
      lines.push(piece.slice(0, cut));
      piece = piece.slice(cut);
    }
    if (!piece) continue;
    const candidate = line ? line + " " + piece : piece;
    if (textWidth(candidate, size, font) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = piece;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------- PDF

type Rgb = [number, number, number];

export type PdfColumn<T = any> = {
  label: string;
  get: (row: T) => string;
  align?: "left" | "right" | "center";
  /** largura relativa da coluna (padrão 1) */
  weight?: number;
};

export type PdfReport<T = any> = {
  title: string;
  subtitle?: string;
  filters?: string;
  summary?: { label: string; value: string }[];
  columns: PdfColumn<T>[];
  rows: T[];
  /** cor de fundo opcional da linha (RGB de 0 a 1) */
  rowFill?: (row: T) => Rgb | undefined;
  orientation?: "portrait" | "landscape" | "auto";
  footerLeft?: string;
  generatedAt?: Date;
};

const BODY = 11; // tamanho do texto da tabela (pt)
const LINE = 14; // altura de cada linha de texto
const PAD_X = 5;
const PAD_Y = 4;

const num = (n: number) => (Math.round(n * 100) / 100).toString();

function escapePdf(text: string): string {
  let out = "";
  for (const ch of text) {
    const byte = toByte(ch);
    if (byte === 40 || byte === 41 || byte === 92) out += "\\" + String.fromCharCode(byte);
    else if (byte > 126) out += "\\" + byte.toString(8).padStart(3, "0");
    else out += String.fromCharCode(byte);
  }
  return out;
}

class Page {
  ops: string[] = [];
  text(x: number, y: number, text: string, size: number, font: Font = "regular", color: Rgb = [0, 0, 0]) {
    this.ops.push(`BT ${color.map(num).join(" ")} rg /${font === "bold" ? "F2" : "F1"} ${num(size)} Tf ${num(x)} ${num(y)} Td (${escapePdf(text)}) Tj ET`);
  }
  rect(x: number, y: number, w: number, h: number, fill?: Rgb, stroke?: Rgb, lineWidth = 0.7) {
    const parts: string[] = [];
    if (fill) parts.push(`${fill.map(num).join(" ")} rg`);
    if (stroke) parts.push(`${stroke.map(num).join(" ")} RG ${num(lineWidth)} w`);
    parts.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re ${fill && stroke ? "B" : fill ? "f" : "S"}`);
    this.ops.push(parts.join(" "));
  }
  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = [0.75, 0.75, 0.75], lineWidth = 0.6) {
    this.ops.push(`${color.map(num).join(" ")} RG ${num(lineWidth)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }
}

function dateTimeBR(date: Date) {
  return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR")}`;
}

/** Monta o PDF e devolve os bytes. */
export function buildPdf<T = any>(report: PdfReport<T>): Uint8Array {
  const landscape = report.orientation === "landscape" || (report.orientation !== "portrait" && report.columns.length > 5);
  const W = landscape ? 842 : 595;
  const H = landscape ? 595 : 842;
  const M = 36;
  const usable = W - 2 * M;
  const generatedAt = report.generatedAt ?? new Date();

  // larguras das colunas
  const totalWeight = report.columns.reduce((s, c) => s + (c.weight ?? 1), 0);
  let colWidths = report.columns.map((c) => (usable * (c.weight ?? 1)) / totalWeight);
  // nenhuma coluna fica mais estreita que a maior palavra do seu título (evita "Quantida/de")
  const minWidths = report.columns.map((c) =>
    Math.max(...c.label.split(/\s+/).map((word) => textWidth(word, BODY, "bold"))) + 2 * PAD_X + 2
  );
  if (minWidths.reduce((a, b) => a + b, 0) < usable) {
    for (let pass = 0; pass < 5; pass++) {
      const tooNarrow = colWidths.map((w, i) => w < minWidths[i]);
      if (!tooNarrow.some(Boolean)) break;
      const fixedTotal = colWidths.reduce((sum, w, i) => sum + (tooNarrow[i] ? minWidths[i] : 0), 0);
      const flexibleTotal = colWidths.reduce((sum, w, i) => sum + (tooNarrow[i] ? 0 : w), 0);
      const scale = (usable - fixedTotal) / flexibleTotal;
      colWidths = colWidths.map((w, i) => (tooNarrow[i] ? minWidths[i] : w * scale));
    }
  }

  const pages: Page[] = [];
  let page = new Page();
  pages.push(page);
  let y = H - M;

  // ---- cabeçalho do relatório
  for (const line of wrapText(report.title, 20, usable, "bold")) {
    y -= 22;
    page.text(M, y, line, 20, "bold");
  }
  y -= 6;
  const meta = [report.subtitle, `Gerado em ${dateTimeBR(generatedAt)}`, report.filters ? `Filtros: ${report.filters}` : ""].filter(Boolean) as string[];
  for (const item of meta) {
    for (const line of wrapText(item, 11, usable)) {
      y -= 15;
      page.text(M, y, line, 11, "regular", [0.25, 0.25, 0.25]);
    }
  }
  y -= 8;
  page.line(M, y, W - M, y, [0.2, 0.2, 0.2], 1);
  y -= 12;

  // ---- resumo em caixas
  if (report.summary && report.summary.length > 0) {
    const perRow = Math.min(report.summary.length, landscape ? 5 : 4);
    const gap = 8;
    const boxW = (usable - gap * (perRow - 1)) / perRow;
    const boxH = 46;
    report.summary.forEach((item, i) => {
      const col = i % perRow;
      if (col === 0 && i > 0) y -= boxH + gap;
      const x = M + col * (boxW + gap);
      page.rect(x, y - boxH, boxW, boxH, [0.96, 0.96, 0.96], [0.8, 0.8, 0.8]);
      page.text(x + 6, y - 16, wrapText(item.label, 10, boxW - 12)[0], 10, "regular", [0.3, 0.3, 0.3]);
      page.text(x + 6, y - 38, wrapText(item.value, 16, boxW - 12, "bold")[0], 16, "bold");
    });
    y -= boxH + 14;
  }

  // ---- tabela
  const drawHeader = () => {
    const lines = report.columns.map((c, i) => wrapText(c.label, BODY, colWidths[i] - 2 * PAD_X, "bold"));
    const rows = Math.max(...lines.map((l) => l.length));
    const h = rows * LINE + 2 * PAD_Y;
    page.rect(M, y - h, usable, h, [0.88, 0.88, 0.88], [0.6, 0.6, 0.6]);
    let x = M;
    report.columns.forEach((c, i) => {
      lines[i].forEach((text, li) => {
        const tw = textWidth(text, BODY, "bold");
        const ax = c.align === "right" ? x + colWidths[i] - PAD_X - tw : c.align === "center" ? x + (colWidths[i] - tw) / 2 : x + PAD_X;
        page.text(ax, y - PAD_Y - (li + 1) * LINE + 3.5, text, BODY, "bold");
      });
      x += colWidths[i];
    });
    y -= h;
  };

  const bottomLimit = M + 22; // espaço para o rodapé
  const newPage = () => {
    page = new Page();
    pages.push(page);
    y = H - M;
  };

  drawHeader();
  report.rows.forEach((row, rowIndex) => {
    const cells = report.columns.map((c, i) => wrapText(c.get(row) ?? "", BODY, colWidths[i] - 2 * PAD_X));
    const h = Math.max(...cells.map((l) => l.length)) * LINE + 2 * PAD_Y;
    if (y - h < bottomLimit) {
      newPage();
      drawHeader();
    }
    const fill = report.rowFill?.(row) ?? (rowIndex % 2 === 1 ? ([0.97, 0.97, 0.97] as Rgb) : undefined);
    if (fill) page.rect(M, y - h, usable, h, fill);
    let x = M;
    report.columns.forEach((c, i) => {
      cells[i].forEach((text, li) => {
        const tw = textWidth(text, BODY);
        const ax = c.align === "right" ? x + colWidths[i] - PAD_X - tw : c.align === "center" ? x + (colWidths[i] - tw) / 2 : x + PAD_X;
        page.text(ax, y - PAD_Y - (li + 1) * LINE + 3.5, text, BODY);
      });
      x += colWidths[i];
    });
    page.line(M, y - h, M + usable, y - h);
    y -= h;
  });

  // total de registros
  if (y - 24 < bottomLimit) newPage();
  y -= 8;
  page.text(M, y - 12, `Total de registros: ${report.rows.length}`, BODY, "bold");

  // ---- rodapé em todas as páginas
  pages.forEach((p, i) => {
    p.line(M, M + 14, W - M, M + 14, [0.7, 0.7, 0.7], 0.6);
    p.text(M, M, report.footerLeft ?? "Gestão Hectares", 10, "regular", [0.35, 0.35, 0.35]);
    const label = `Página ${i + 1} de ${pages.length}`;
    p.text(W - M - textWidth(label, 10), M, label, 10, "regular", [0.35, 0.35, 0.35]);
  });

  // ---- escrever o arquivo
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length; // número do objeto
  };
  const catalog = add("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  add("PLACEHOLDER"); // 2 (Pages, preenchido depois)
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4
  const pageIds: number[] = [];
  for (const p of pages) {
    const stream = p.ops.join("\n");
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const info = add(`<< /Title (${escapePdf(report.title)}) /Producer (Gestao Hectares) >>`);

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // todo o texto é ASCII (acentos viram \ooo), então 1 caractere = 1 byte
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

/** Gera o PDF e baixa no computador. */
export function downloadPdf<T = any>(report: PdfReport<T>, filename: string) {
  const bytes = buildPdf(report);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
