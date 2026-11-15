import { createFileRoute } from "@tanstack/react-router";
import { mapNota, NotasCallbackSchema } from "@/lib/make-integration";

export const Route = createFileRoute("/api/public/notas-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.MAKE_CALLBACK_SECRET;
        if (!expected) return new Response("Server not configured", { status: 500 });
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = NotasCallbackSchema.safeParse(json);
        if (!parsed.success) return new Response("Invalid body", { status: 400 });
        if (parsed.data.secret !== expected) return new Response("Unauthorized", { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("notas").insert(mapNota(parsed.data));
          if (error) {
            console.error("[notas-callback] insert error", error);
            return new Response("Insert failed", { status: 500 });
          }
          return Response.json({ ok: true });
        } catch (error) {
          console.error("[notas-callback] insert failed", error);
          return new Response("Insert failed", { status: 500 });
        }
      },
    },
  },
});