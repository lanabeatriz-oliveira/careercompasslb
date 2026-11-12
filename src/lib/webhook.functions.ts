import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EventoSchema = z.object({
  evento: z.enum(["onboarding_concluido", "gerar_posts", "regenerar_post"]),
  payload: z.record(z.unknown()).default({}),
});

export const dispararWebhookMake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EventoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: cfg, error } = await context.supabase
      .from("configuracoes")
      .select("webhook_url, cadencia, quantidade")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      console.error("[webhook] erro lendo configuracoes", error);
      return { ok: false, motivo: "config_error" as const };
    }
    if (!cfg?.webhook_url) {
      return { ok: false, motivo: "webhook_nao_configurado" as const };
    }

    let respostas: unknown = {};
    const { data: perfil, error: perfilError } = await context.supabase
      .from("perfis_contexto")
      .select("respostas")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (perfilError) {
      console.error("[webhook] erro lendo perfis_contexto", perfilError);
    } else if (perfil?.respostas) {
      respostas = perfil.respostas;
    }

    try {
      const res = await fetch(cfg.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento: data.evento,
          user_id: context.userId,
          timestamp: new Date().toISOString(),
          cadencia: cfg.cadencia,
          quantidade: cfg.quantidade,
          respostas,
          ...data.payload,
        }),
      });
      if (!res.ok) {
        console.error("[webhook] status", res.status);
        return { ok: false, motivo: "http_error" as const, status: res.status };
      }
      return { ok: true };
    } catch (err) {
      console.error("[webhook] fetch falhou", err);
      return { ok: false, motivo: "network_error" as const };
    }
  });
