import { describe, expect, it } from "vitest";
import { mergeOnboarding, onboardingSearchSchema, savedAnswers, shouldRedirectOnboarding } from "./onboarding";
import { limitPdfText, PDF_MAX_BYTES, validateLinkedInPdf } from "./linkedin-pdf";
import { LinkedInFieldsSchema, mergeLinkedIn } from "./make-integration";

describe("Onboarding restart", () => {
  it("allows restart only for refazer=1 on completed profiles", () => {
    expect(onboardingSearchSchema.parse({ refazer: 1 }).refazer).toBe("1");
    expect(onboardingSearchSchema.parse({ refazer: "1" }).refazer).toBe("1");
    expect(shouldRedirectOnboarding(true, "1")).toBe(false);
    expect(shouldRedirectOnboarding(true)).toBe(true);
    expect(shouldRedirectOnboarding(true, "0")).toBe(true);
    expect(shouldRedirectOnboarding(false)).toBe(false);
  });
  it("preserves supplemental and unknown saved keys while updating answers", () => {
    const previous = { cargo: "Antigo", linkedin_headline: "Headline", linkedin_resumo: "Sobre", linkedin_experiencias: "Trabalhos", linkedin_pdf: "PDF", extra: "Preservar" };
    expect(mergeOnboarding(previous, { cargo: "Novo", outras_experiencias: "Projeto A\nProjeto B" })).toEqual({ ...previous, cargo: "Novo", outras_experiencias: "Projeto A\nProjeto B" });
  });
  it("preloads all editable answers including optional experiences and at most three themes", () => {
    const saved = { cargo: "Gestora", setor: "TI", conquista: "30%", diferencial: "Equipe", outras_experiencias: "Projeto", tom: "Direto", temas: ["a", "b", "c"] };
    expect(savedAnswers(saved)).toEqual(saved);
    expect(savedAnswers({ temas: ["a", "b", "c", "d"] }).temas).toEqual(["a", "b", "c"]);
  });
  it("supports skipping optional experiences with an empty string", () => {
    expect(mergeOnboarding({ outras_experiencias: "Old" }, { outras_experiencias: "" }).outras_experiencias).toBe("");
  });
});
describe("Local LinkedIn PDF", () => {
  it("accepts only PDF filenames", () => {
    expect(() => validateLinkedInPdf({ name: "Profile.PDF", size: 10 })).not.toThrow();
    expect(() => validateLinkedInPdf({ name: "profile.txt", size: 10 })).toThrow();
  });
  it("limits files to five MB inclusive", () => {
    expect(PDF_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(() => validateLinkedInPdf({ name: "profile.pdf", size: 5 * 1024 * 1024 })).not.toThrow();
    expect(() => validateLinkedInPdf({ name: "profile.pdf", size: 5 * 1024 * 1024 + 1 })).toThrow();
  });
  it("limits extracted text to 12000 characters", () => {
    expect(limitPdfText("x".repeat(12001))).toHaveLength(12000);
  });
  it("rejects PDFs without extractable text", () => { expect(() => limitPdfText(" \n ")).toThrow(); });
  it("validates and merges the editable PDF text along with the other LinkedIn fields", () => {
    const fields = { linkedin_headline: "", linkedin_resumo: "", linkedin_experiencias: "", linkedin_pdf: "x".repeat(12000) };
    expect(LinkedInFieldsSchema.safeParse(fields).success).toBe(true);
    expect(LinkedInFieldsSchema.safeParse({ ...fields, linkedin_pdf: "x".repeat(12001) }).success).toBe(false);
    expect(mergeLinkedIn({ cargo: "Analista", outras_experiencias: "Projeto" }, fields)).toEqual({ cargo: "Analista", outras_experiencias: "Projeto", ...fields });
  });
});