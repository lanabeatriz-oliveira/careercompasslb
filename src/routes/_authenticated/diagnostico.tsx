import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { dispararWebhookMake } from "@/lib/webhook.functions";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({ meta: [{ title: "Diagnóstico — Carreiras" }] }),
  component: DiagnosticoPage,
});

type Notas = {
  nota_geral: number;
  headline_nota: number;
  headline_comentario: string;
  resumo_nota: number;
  resumo_comentario: string;
  experiencia_nota: number;
  experiencia_comentario: string;
  atividade_nota: number;
  atividade_comentario: string;
};

function DiagnosticoPage() {
  const navigate = useNavigate();
  const disparar = useServerFn(dispararWebhookMake);
  const [notas, setNotas] = useState<Notas | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: perfil } = await supabase
        .from("perfis_contexto")
        .select("concluido_em")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!perfil?.concluido_em) {
        navigate({ to: "/onboarding" });
        return;
      }
      const { data } = await supabase
        .from("notas")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setNotas(data as Notas);
      setLoading(false);
    })();
  }, [navigate]);

  async function gerarPosts() {
    setGerando(true);
    const r = await disparar({ data: { evento: "gerar_posts", payload: {} } });
    setGerando(false);
    if (r.ok) {
      toast.success("Solicitação enviada! Os posts vão aparecer em breve.");
      navigate({ to: "/posts" });
    } else if (r.motivo === "webhook_nao_configurado") {
      toast.error("Configure a URL do webhook Make.com em Configurações.");
      navigate({ to: "/configuracoes" });
    } else {
      toast.error("Não conseguimos disparar a geração. Tente novamente.");
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!notas) return <div className="p-8">Sem diagnóstico ainda.</div>;

  const categorias = [
    { titulo: "Headline e Foto", nota: notas.headline_nota, comentario: notas.headline_comentario },
    { titulo: "Resumo", nota: notas.resumo_nota, comentario: notas.resumo_comentario },
    { titulo: "Experiência", nota: notas.experiencia_nota, comentario: notas.experiencia_comentario },
    {
      titulo: "Atividade e Consistência",
      nota: notas.atividade_nota,
      comentario: notas.atividade_comentario,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Seu diagnóstico</h1>
          <p className="text-sm text-muted-foreground">
            Como está seu LinkedIn hoje e onde focar primeiro.
          </p>
        </div>
        <Button onClick={gerarPosts} disabled={gerando} size="lg">
          <Sparkles className="mr-2 h-4 w-4" />
          {gerando ? "Enviando..." : "Gerar posts"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-4 p-8 md:flex-row md:gap-8">
          <NotaCircular valor={Number(notas.nota_geral)} />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nota geral do perfil</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {rotuloNota(Number(notas.nota_geral))}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Uma média ponderada das 4 categorias abaixo. Foque primeiro nas com menor nota.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {categorias.map((c) => (
          <Card key={c.titulo}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{c.titulo}</CardTitle>
              <span className="font-display text-2xl font-semibold text-primary">
                {Number(c.nota).toFixed(1)}
              </span>
            </CardHeader>
            <CardContent>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(Number(c.nota) / 10) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{c.comentario}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotaCircular({ valor }: { valor: number }) {
  const pct = Math.max(0, Math.min(1, valor / 10));
  const r = 46;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-secondary" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="fill-none stroke-primary transition-all"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-semibold">{valor.toFixed(1)}</div>
        <div className="text-xs text-muted-foreground">de 10</div>
      </div>
    </div>
  );
}

function rotuloNota(n: number) {
  if (n >= 8.5) return "Excelente";
  if (n >= 7) return "Muito bom, com ajustes";
  if (n >= 5) return "Precisa de atenção";
  return "Prioridade alta";
}
