import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PostSchema = z.object({
  tema: z.string().min(1).max(200),
  hook: z.string().min(1).max(500),
  corpo: z.string().min(1).max(5000),
  cta: z.string().min(1).max(500),
  formato: z.enum(["texto", "carrossel", "imagem"]).default("texto"),
  visual_sugestao: z.string().max(1000).optional().nullable(),
});

const BodySchema = z.object({
  secret: z.string().min(1),
  user_id: z.string().uuid(),
  posts: z.array(PostSchema).min(1).max(50),
});

export const Route = createFileRoute("/api/public/posts-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.MAKE_CALLBACK_SECRET;
        if (!expected) {
          return new Response("Server not configured", { status: 500 });
        }
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = BodySchema.safeParse(json);
        if (!parsed.success) {
          return new Response("Invalid body", { status: 400 });
        }
        if (parsed.data.secret !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const rows = parsed.data.posts.map((p) => ({
          user_id: parsed.data.user_id,
          tema: p.tema,
          hook: p.hook,
          corpo: p.corpo,
          cta: p.cta,
          formato: p.formato,
          visual_sugestao: p.visual_sugestao ?? null,
          status: "pendente_revisao" as const,
        }));
        const { error } = await supabaseAdmin.from("posts").insert(rows);
        if (error) {
          console.error("[posts-callback] insert error", error);
          return new Response("Insert failed", { status: 500 });
        }
        return Response.json({ ok: true, inserted: rows.length });
      },
    },
  },
});
