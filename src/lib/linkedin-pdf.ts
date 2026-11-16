export const PDF_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_TEXT_LENGTH = 12000;

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