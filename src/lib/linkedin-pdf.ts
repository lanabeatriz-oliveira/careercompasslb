export const PDF_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_TEXT_LENGTH = 12000;

const normalizeHeading = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const summaryHeadings = new Set(["resumo", "sobre", "summary", "about"]);
const experienceHeadings = new Set(["experiencia", "experiencias", "experience"]);
const endHeadings = new Set(["formacao academica", "education", "licencas e certificados", "licenses & certifications", "competencias", "principais competencias", "top skills", "idiomas", "languages", "projetos", "publicacoes", "honors-awards", "contato", "contact"]);
const isHeading = (line: string) => summaryHeadings.has(normalizeHeading(line)) || experienceHeadings.has(normalizeHeading(line)) || endHeadings.has(normalizeHeading(line));
const isLocation = (line: string) => /,|\b(brasil|brazil|united states|united kingdom|portugal|canada|área|area|região|region)\b/i.test(line) && !/[|@]/.test(line);

/** Conservative extraction: ambiguous profile headers stay empty for manual review. */
export function parseLinkedInPdf(texto: string) {
  const lines = texto.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[\t\u00a0 ]+/g, " ").trim()).filter(Boolean);
  const result = { headline: "", resumo: "", experiencias: "" };
  let section: "resumo" | "experiencias" | null = null;
  const sections = { resumo: [] as string[], experiencias: [] as string[] };
  for (const line of lines) {
    const heading = normalizeHeading(line);
    if (summaryHeadings.has(heading)) section = "resumo";
    else if (experienceHeadings.has(heading)) section = "experiencias";
    else if (endHeadings.has(heading)) section = null;
    else if (section && !/^page \d+ of \d+$|^p[aá]gina \d+ de \d+$/i.test(line)) sections[section].push(line);
  }
  result.resumo = sections.resumo.join("\n").slice(0, 3000);
  result.experiencias = sections.experiencias.join("\n").slice(0, 3000);
  const firstSection = lines.findIndex((line) => summaryHeadings.has(normalizeHeading(line)) || experienceHeadings.has(normalizeHeading(line)));
  const top = lines.slice(0, firstSection < 0 ? Math.min(lines.length, 30) : firstSection);
  for (let index = 0; index < top.length; index++) {
    const name = top[index];
    // Names alone are not enough: require a short headline followed by location or a section.
    if (isHeading(name) || !/^[\p{Lu}][\p{L}'’-]+(?:\s+(?:[\p{Lu}][\p{L}'’-]+|da|de|do|dos|das|van|von)){1,5}$/u.test(name)) continue;
    const following = top.slice(index + 1);
    const location = following.findIndex(isLocation);
    const candidate = location >= 0 ? following.slice(0, location) : following;
    if (candidate.length < 1 || candidate.length > 3 || candidate.some(isHeading)) continue;
    if (location < 0 && (firstSection < 0 || !/\b(manager|director|engineer|analyst|consultant|specialist|gerente|diretor|diretora|analista|engenheir|consultor|especialista|lider|líder)\w*\b|\|/i.test(candidate.join(" ")))) continue;
    result.headline = candidate.join("\n").slice(0, 300);
  }
  return result;
}

export function validateLinkedInPdf(file: Pick<File, "name" | "size">) {
  if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Escolha um arquivo PDF do LinkedIn.");
  if (file.size > PDF_MAX_BYTES) throw new Error("O PDF deve ter no máximo 5 MB.");
}
export function limitPdfText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Não encontramos texto neste PDF. Envie um PDF com texto selecionável ou cole as informações abaixo.");
  return trimmed.slice(0, PDF_MAX_TEXT_LENGTH);
}

// Called only from the upload event: PDF.js and its worker never enter SSR execution.
export async function extractLinkedInPdf(file: File) {
  validateLinkedInPdf(file);
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    let text = "";
    for (let index = 1; index <= pdf.numPages && text.length < PDF_MAX_TEXT_LENGTH; index++) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      text += content.items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("") + "\n";
      page.cleanup();
    }
    return limitPdfText(text);
  } finally {
    await task.destroy();
  }
}