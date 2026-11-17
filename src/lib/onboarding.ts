import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import type { Json } from "@/integrations/supabase/types";

export const onboardingSearchSchema = z.object({ refazer: fallback(z.union([z.string(), z.number()]).transform(String), "").optional() });
export const onboardingSearch = zodValidator(onboardingSearchSchema);
export function shouldRedirectOnboarding(completed: boolean, refazer?: string) {
  return completed && refazer !== "1";
}
export type OnboardingAnswers = {
  cargo?: string;
  setor?: string;
  conquista?: string;
  diferencial?: string;
  outras_experiencias?: string;
  tom?: string;
  temas?: string[];
};
export function savedAnswers(value: Json): OnboardingAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: OnboardingAnswers = {};
  for (const key of ["cargo", "setor", "conquista", "diferencial", "outras_experiencias", "tom"] as const) {
    if (typeof value[key] === "string") result[key] = value[key];
  }
  if (Array.isArray(value.temas)) result.temas = value.temas.filter((item): item is string => typeof item === "string").slice(0, 3);
  return result;
}
export function mergeOnboarding(previous: Json, answers: OnboardingAnswers) {
  const record = previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {};
  return { ...record, ...answers };
}
export const MAX_TEMAS = 3;
/** Splits typed themes by comma/semicolon/newline, dedupes case-insensitively and caps at 3. */
export function adicionarTemas(atuais: string[], texto: string) {
  const temas = [...atuais];
  let excedeu = false;
  for (const item of texto.split(/[,;\n]/)) {
    const t = item.trim();
    if (!t || temas.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    if (temas.length >= MAX_TEMAS) { excedeu = true; continue; }
    temas.push(t);
  }
  return { temas, excedeu };
}
