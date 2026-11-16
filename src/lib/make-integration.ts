import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export const POLLING_INTERVAL_MS = 5_000;
export const DIAGNOSTIC_TIMEOUT_MS = 120_000;
const ScoreSchema = z.number().min(0).max(10).transform((n) => Math.round(n * 10) / 10);
const CategorySchema = z.object({
  nota: ScoreSchema,
  comentario: z.string().min(1).max(1500),
});
export const NotasCallbackSchema = z.object({
  secret: z.string().min(1),
  user_id: z.string().uuid(),
  nota: z.object({
    nota_geral: ScoreSchema,
    headline: CategorySchema,
    resumo: CategorySchema,
    experiencia: CategorySchema,
    atividade: CategorySchema,
  }),
});

export function mapNota(body: z.infer<typeof NotasCallbackSchema>) {
  const { nota, user_id } = body;
  return {
    user_id,
    nota_geral: nota.nota_geral,
    headline_nota: nota.headline.nota,
    headline_comentario: nota.headline.comentario,
    resumo_nota: nota.resumo.nota,
    resumo_comentario: nota.resumo.comentario,
    experiencia_nota: nota.experiencia.nota,
    experiencia_comentario: nota.experiencia.comentario,
    atividade_nota: nota.atividade.nota,
    atividade_comentario: nota.atividade.comentario,
  };
}

export function postsChanged<T extends { id: string; status: string }>(previous: T[], next: T[]) {
  if (previous.length !== next.length) return true;
  const statuses = new Map(previous.map((post) => [post.id, post.status]));
  return next.some((post) => statuses.get(post.id) !== post.status);
}

export const LinkedInFieldsSchema = z.object({
  linkedin_headline: z.string().max(3000),
  linkedin_resumo: z.string().max(3000),
  linkedin_experiencias: z.string().max(3000),
  linkedin_pdf: z.string().max(12000).optional(),
});

export function mergeLinkedIn(respostas: Json, fields: z.infer<typeof LinkedInFieldsSchema>) {
  const previous = respostas && typeof respostas === "object" && !Array.isArray(respostas) ? respostas : {};
  return { ...previous, ...LinkedInFieldsSchema.parse(fields) };
}

export function webhookUrl(shared: string | undefined, fallback: string | null | undefined) {
  return shared?.trim() || fallback?.trim() || null;
}