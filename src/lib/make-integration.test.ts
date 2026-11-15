import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_TIMEOUT_MS, POLLING_INTERVAL_MS, LinkedInFieldsSchema, NotasCallbackSchema, mapNota, mergeLinkedIn, postsChanged, webhookUrl } from "./make-integration";

const category = { nota: 7.56, comentario: "Análise real" };
const body = { secret: "test-only", user_id: "11111111-1111-4111-8111-111111111111", nota: {
  nota_geral: 6.84, headline: category, resumo: category, experiencia: category, atividade: category,
} };
describe("Make integration rules", () => {
  it("polls every five seconds", () => { expect(POLLING_INTERVAL_MS).toBe(5000); });
  it("bounds diagnostic waiting to two minutes", () => { expect(DIAGNOSTIC_TIMEOUT_MS).toBe(120000); });
  it("changes posts only for different ids or statuses", () => {
    const previous = [{ id: "a", status: "aprovado", corpo: "original" }];
    expect(postsChanged(previous, [{ ...previous[0], corpo: "changed" }])).toBe(false);
    expect(postsChanged(previous, [{ ...previous[0], status: "rejeitado" }])).toBe(true);
    expect(postsChanged(previous, [{ ...previous[0], id: "b" }])).toBe(true);
    expect(postsChanged(previous, [])).toBe(true);
  });
  it("accepts scores from zero to ten and rejects outside that range", () => {
    for (const score of [0, 10]) expect(NotasCallbackSchema.safeParse({ ...body, nota: { ...body.nota, nota_geral: score } }).success).toBe(true);
    for (const score of [-0.1, 10.1]) expect(NotasCallbackSchema.safeParse({ ...body, nota: { ...body.nota, headline: { ...category, nota: score } } }).success).toBe(false);
  });
  it("rounds all scores to one decimal and maps each category", () => {
    expect(mapNota(NotasCallbackSchema.parse(body))).toEqual({ user_id: body.user_id, nota_geral: 6.8,
      headline_nota: 7.6, headline_comentario: category.comentario,
      resumo_nota: 7.6, resumo_comentario: category.comentario,
      experiencia_nota: 7.6, experiencia_comentario: category.comentario,
      atividade_nota: 7.6, atividade_comentario: category.comentario,
    });
  });
  it("limits comments to one through 1500 characters", () => {
    for (const length of [1, 1500]) expect(NotasCallbackSchema.safeParse({ ...body, nota: { ...body.nota, resumo: { ...category, comentario: "x".repeat(length) } } }).success).toBe(true);
    for (const length of [0, 1501]) expect(NotasCallbackSchema.safeParse({ ...body, nota: { ...body.nota, resumo: { ...category, comentario: "x".repeat(length) } } }).success).toBe(false);
  });
  it("requires a uuid owner", () => { expect(NotasCallbackSchema.safeParse({ ...body, user_id: "invalid" }).success).toBe(false); });
  it("limits each LinkedIn field to 3000 characters", () => {
    const fields = { linkedin_headline: "", linkedin_resumo: "", linkedin_experiencias: "" };
    for (const key of Object.keys(fields)) {
      expect(LinkedInFieldsSchema.safeParse({ ...fields, [key]: "x".repeat(3000) }).success).toBe(true);
      expect(LinkedInFieldsSchema.safeParse({ ...fields, [key]: "x".repeat(3001) }).success).toBe(false);
    }
  });
  it("preserves other onboarding keys when merging LinkedIn fields", () => {
    const fields = { linkedin_headline: "new", linkedin_resumo: "about", linkedin_experiencias: "jobs" };
    expect(mergeLinkedIn({ cargo: "Analista", temas: ["dados"], linkedin_headline: "old" }, fields)).toEqual({ cargo: "Analista", temas: ["dados"], ...fields });
  });
  it("prefers the shared URL and keeps per-user fallback", () => {
    expect(webhookUrl("https://shared.example", "https://user.example")).toBe("https://shared.example");
    expect(webhookUrl(undefined, "https://user.example")).toBe("https://user.example");
    expect(webhookUrl(undefined, null)).toBeNull();
  });
});