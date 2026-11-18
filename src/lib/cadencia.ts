import { z } from "zod";

export const CadenciaSchema = z.enum(["semanal", "quinzenal", "mensal", "personalizado"]);
export type Cadencia = z.infer<typeof CadenciaSchema>;
export const PADRAO = { semanal: 3, quinzenal: 5, mensal: 9 } as const;
export const CadenciaConfigSchema = z.object({ cadencia: CadenciaSchema, quantidade: z.number().int().min(1).max(12) });
export function quantidadeCadencia(cadencia: Cadencia, quantidade: number) {
  return cadencia === "personalizado" ? quantidade : PADRAO[cadencia];
}