import { describe, expect, it } from "vitest";
import { parseLinkedInPdf } from "./linkedin-pdf";
import { savedAnswers, validLinkedInUrl } from "./onboarding";

describe("LinkedIn PDF parsing", () => {
  it("extracts Portuguese sections without sidebar or education", () => {
    expect(parseLinkedInPdf("Contato\r\nana@email.com\r\nPrincipais competências\r\nGestão\r\nAna Silva\r\nGerente  de projetos\r\nTecnologia | Liderança\r\nSão Paulo, Brasil\r\nSOBRE\r\n Lidero equipes. \r\nEXPERIÊNCIA\r\nEmpresa A\r\nGerente\r\nFormação acadêmica\r\nUniversidade")).toEqual({ headline: "Gerente de projetos\nTecnologia | Liderança", resumo: "Lidero equipes.", experiencias: "Empresa A\nGerente" });
  });
  it("extracts English sections and ends at certificates", () => {
    expect(parseLinkedInPdf("Jane Smith\nEngineering Manager\nLondon, United Kingdom\nSummary\nBuilding strong teams.\nExperience\nAcme\nManager\nLicenses & Certifications\nCertificate")).toEqual({ headline: "Engineering Manager", resumo: "Building strong teams.", experiencias: "Acme\nManager" });
  });
  it.each(["Formação acadêmica", "Education", "Licenças e certificados", "Licenses & Certifications", "Competências", "Principais competências", "Top Skills", "Idiomas", "Languages", "Projetos", "Publicações", "Honors-Awards", "Contato", "Contact"])("ends sections at %s", (heading) => {
    expect(parseLinkedInPdf(`Resumo\nTexto\n${heading}\nNão incluir`).resumo).toBe("Texto");
  });
  it("keeps uncertain or missing fields empty", () => {
    expect(parseLinkedInPdf("Texto sem estrutura")).toEqual({ headline: "", resumo: "", experiencias: "" });
    expect(parseLinkedInPdf("Jane Smith\nSomething ambiguous\nSummary\nText").headline).toBe("");
  });
  it("limits headline to 300 and other fields to 3000", () => {
    const parsed = parseLinkedInPdf(`Jane Smith\nManager ${"x".repeat(400)}\nLondon, UK\nAbout\n${"a".repeat(3001)}\nExperience\n${"b".repeat(3001)}`);
    expect(parsed.headline).toHaveLength(300);
    expect(parsed.resumo).toHaveLength(3000);
    expect(parsed.experiencias).toHaveLength(3000);
  });
});
describe("Onboarding LinkedIn material", () => {
  it("accepts profile links but rejects lookalike hosts", () => {
    expect(validLinkedInUrl("https://www.linkedin.com/in/ana/")).toBe(true);
    expect(validLinkedInUrl("https://evil.com/linkedin.com/in/ana")).toBe(false);
    expect(validLinkedInUrl("https://linkedin.com/company/acme")).toBe(false);
  });
  it("preloads saved PDF fields and profile link", () => {
    const fields = { linkedin_url: "https://linkedin.com/in/ana", linkedin_pdf: "PDF", linkedin_headline: "Manager", linkedin_resumo: "About", linkedin_experiencias: "Jobs" };
    expect(savedAnswers(fields)).toEqual(fields);
  });
});