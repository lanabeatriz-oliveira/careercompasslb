import { expect, it } from "vitest";
import { CadenciaConfigSchema, quantidadeCadencia } from "./cadencia";
it.each([["semanal", 3], ["quinzenal", 5], ["mensal", 9]] as const)("uses %s count %i", (cadencia, quantidade) => {
  expect(quantidadeCadencia(cadencia, 12)).toBe(quantidade);
});
it("accepts custom integers from 1 through 12 only", () => {
  for (const quantidade of [1, 12]) expect(CadenciaConfigSchema.safeParse({ cadencia: "personalizado", quantidade }).success).toBe(true);
  for (const quantidade of [0, 13, 1.5, NaN]) expect(CadenciaConfigSchema.safeParse({ cadencia: "personalizado", quantidade }).success).toBe(false);
  expect(quantidadeCadencia("personalizado", 7)).toBe(7);
});