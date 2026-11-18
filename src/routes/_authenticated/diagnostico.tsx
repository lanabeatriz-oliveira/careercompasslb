import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { dispararWebhookMake } from "@/lib/webhook.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Sparkles, Upload, MessageSquare } from "lucide-react";
import { extractLinkedInPdf, parseLinkedInPdf } from "@/lib/linkedin-pdf";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DIAGNOSTIC_TIMEOUT_MS, POLLING_INTERVAL_MS, mergeLinkedIn, LinkedInFieldsSchema } from "@/lib/make-integration";

import { useCadencia } from "@/hooks/use-cadencia";
import { CadenciaSelector } from "@/components/cadencia-selector";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => pageMeta("Diagnóstico — Carreiras", "Acompanhe a análise real do seu perfil no LinkedIn e atualize seu diagnóstico."),
  component: DiagnosticoPage,
});

type Notas = {
  id: string;
  created_at: string;
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
  const cadence = useCadencia();
  const disparar = useServerFn(dispararWebhookMake);
  const [notas, setNotas] = useState<Notas | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [espera, setEspera] = useState<{ baseline: Notas | null; inicio: number; avisar: boolean } | null>(null);
  const [expirou, setExpirou] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [campos, setCampos] = useState({ linkedin_headline: "", linkedin_resumo: "", linkedin_experiencias: "", linkedin_pdf: "" });
  const [extraindo, setExtraindo] = useState(false);
  const [pdfErro, setPdfErro] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const atualizando = solicitando || !!espera;

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: perfil, error: perfilError } = await supabase
        .from("perfis_contexto")
        .select("concluido_em, respostas")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!mounted.current) return;
      if (perfilError) throw perfilError;
      if (!perfil?.concluido_em) {
        navigate({ to: "/onboarding" });
        return;
      }
      setUserId(u.user.id);
      const respostas = perfil.respostas;
      if (respostas && typeof respostas === "object" && !Array.isArray(respostas)) {
        setCampos({
          linkedin_headline: typeof respostas.linkedin_headline === "string" ? respostas.linkedin_headline : "",
          linkedin_resumo: typeof respostas.linkedin_resumo === "string" ? respostas.linkedin_resumo : "",
          linkedin_experiencias: typeof respostas.linkedin_experiencias === "string" ? respostas.linkedin_experiencias : "",
          linkedin_pdf: typeof respostas.linkedin_pdf === "string" ? respostas.linkedin_pdf : "",
        });
      }
      const { data, error } = await supabase
        .from("notas")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted.current) return;
      if (error) throw error;
      if (data) setNotas(data as Notas);
      else setEspera({ baseline: null, inicio: Date.now(), avisar: false });
      } catch {
        if (mounted.current) {
          setExpirou(true);
          toast.error("Não conseguimos carregar seu diagnóstico. Tente novamente.");
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    return () => { mounted.current = false; };
  }, [navigate]);

  useEffect(() => {
    if (!espera || !userId) return;
    let active = true;
    let fetching = false;
    const remaining = DIAGNOSTIC_TIMEOUT_MS - (Date.now() - espera.inicio);
    function expire() {
      if (!active) return;
      active = false;
      setEspera(null);
      setExpirou(true);
    }
    const timeout = window.setTimeout(expire, Math.max(0, remaining));
    const interval = window.setInterval(async () => {
      if (!active || fetching) return;
      if (Date.now() - espera.inicio >= DIAGNOSTIC_TIMEOUT_MS) { expire(); return; }
      fetching = true;
      try {
        let query = supabase.from("notas").select("*").eq("user_id", userId);
        if (espera.baseline) query = query.gt("created_at", espera.baseline.created_at);
        const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!active || error || !data) return;
        active = false;
        setNotas(data as Notas);
        setEspera(null);
        setExpirou(false);
        if (espera.avisar) toast.success("Diagnóstico atualizado!");
      } catch {
        // Keep waiting until the bounded deadline on transient failures.
      } finally { fetching = false; }
    }, POLLING_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [espera, userId]);

  async function atualizarDiagnostico() {
    if (atualizando) return;
    setSolicitando(true);
    setExpirou(false);
    const baseline = notas;
    const inicio = Date.now();
    try {
      const r = await disparar({ data: { evento: "gerar_nota", payload: {} } });
      if (!mounted.current) return;
      if (r.ok) {
        setEspera({ baseline, inicio, avisar: true });
      } else {
        setExpirou(true);
        if (r.motivo === "webhook_nao_configurado") {
          toast.error("A integração com o Make.com ainda não está configurada.");
          navigate({ to: "/configuracoes" });
        } else toast.error("Não conseguimos solicitar o diagnóstico. Tente novamente.");
      }
    } catch {
      if (mounted.current) {
        setExpirou(true);
        toast.error("Não conseguimos solicitar o diagnóstico. Tente novamente.");
      }
    } finally { if (mounted.current) setSolicitando(false); }
  }

  async function salvarPerfil() {
    if (salvando || atualizando || extraindo) return;
    const parsed = LinkedInFieldsSchema.safeParse(campos);
    if (!parsed.success) { toast.error("Os campos devem ter até 3000 caracteres e o texto do PDF até 12000."); return; }
    setSalvando(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão indisponível");
      const { data: perfil, error } = await supabase.from("perfis_contexto").select("respostas")
        .eq("user_id", u.user.id).single();
      if (error || !perfil) throw error ?? new Error("Perfil indisponível");
      const { error: saveError } = await supabase.from("perfis_contexto")
        .update({ respostas: mergeLinkedIn(perfil.respostas, parsed.data) }).eq("user_id", u.user.id);
      if (saveError) throw saveError;
      if (mounted.current) await atualizarDiagnostico();
    } catch {
      if (mounted.current) toast.error("Não conseguimos salvar seu perfil. Tente novamente.");
    } finally { if (mounted.current) setSalvando(false); }
  }

  async function gerarPosts() {
    if (gerando) return;
    setGerando(true);
    try {
    await cadence.persist();
    const r = await disparar({ data: { evento: "gerar_posts", payload: {} } });
    setGerando(false);
    if (r.ok) {
      toast.success("Solicitação enviada! Os posts vão aparecer em breve.");
      navigate({ to: "/posts", search: { gerando: "1" } });
    } else if (r.motivo === "webhook_nao_configurado") {
      toast.error("A integração com o Make.com ainda não está configurada.");
      navigate({ to: "/configuracoes" });
    } else {
      toast.error("Não conseguimos disparar a geração. Tente novamente.");
    }
    } catch { toast.error("Não conseguimos salvar a cadência ou gerar posts. Tente novamente."); }
    finally { setGerando(false); }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const categorias = notas ? [
    { titulo: "Headline e Foto", nota: notas.headline_nota, comentario: notas.headline_comentario },
    { titulo: "Resumo", nota: notas.resumo_nota, comentario: notas.resumo_comentario },
    { titulo: "Experiência", nota: notas.experiencia_nota, comentario: notas.experiencia_comentario },
    {
      titulo: "Atividade e Consistência",
      nota: notas.atividade_nota,
      comentario: notas.atividade_comentario,
    },
  ] : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      {atualizando && <div role="status" className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
        <span>Gerando seu diagnóstico... isso leva de 10 a 30 segundos. Você não precisa recarregar a página.</span>
      </div>}
      <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">Seu diagnóstico</h1>
          <p className="text-sm text-muted-foreground">
            Como está seu LinkedIn hoje e onde focar primeiro.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/onboarding", search: { refazer: "1" } })}>
          <MessageSquare className="mr-2 h-4 w-4 shrink-0" /> Refazer onboarding
        </Button>
        {notas && <Button variant="outline" onClick={atualizarDiagnostico} disabled={atualizando || salvando} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          {atualizando ? "Gerando..." : "Atualizar diagnóstico"}
        </Button>}
        {notas && <div className="flex min-w-0 flex-wrap items-start gap-2">
        <CadenciaSelector cadencia={cadence.cadencia} quantidade={cadence.quantidade} disabled={cadence.loading || cadence.error || gerando} onChange={cadence.change} />
        <Button onClick={gerarPosts} disabled={gerando || cadence.loading || cadence.error || !cadence.valid} size="lg">
          <Sparkles className="mr-2 h-4 w-4" />
          {gerando ? "Enviando..." : "Gerar posts"}
        </Button></div>}
        </div>
      </div>

      {!notas && <div className="space-y-3" role="status">
        <p>{atualizando ? "Gerando seu diagnóstico..." : "Seu diagnóstico ainda não chegou. Tente novamente."}</p>
        {!atualizando && <Button onClick={atualizarDiagnostico} disabled={salvando}>
          <RefreshCw className="mr-2 h-4 w-4" /> Gerar diagnóstico
        </Button>}
      </div>}
      {notas && expirou && <p className="text-sm text-muted-foreground" role="status">A atualização demorou mais que o esperado. Tente novamente.</p>}

      {notas && <>
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
      </>}

      <Card>
        <CardHeader><CardTitle className="text-base">Cole seu perfil atual do LinkedIn (melhora a nota)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="hidden" aria-label="PDF do LinkedIn" onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file || extraindo) return;
              setExtraindo(true);
              setPdfErro(null);
              try {
                const text = await extractLinkedInPdf(file);
                if (mounted.current) {
                  const parsed = parseLinkedInPdf(text);
                  setCampos((previous) => ({ ...previous, linkedin_pdf: text, linkedin_headline: parsed.headline, linkedin_resumo: parsed.resumo, linkedin_experiencias: parsed.experiencias }));
                  toast.success(`Preenchemos ${Object.values(parsed).filter(Boolean).length} de 3 campos. Confira e corrija se precisar.`);
                }
              } catch (error) {
                if (mounted.current) setPdfErro(error instanceof Error && /PDF|pdf/.test(error.message)
                  ? error.message : "Não conseguimos ler este PDF. Confira se ele abre normalmente e não está protegido por senha.");
              } finally { if (mounted.current) setExtraindo(false); }
            }} />
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={extraindo || salvando || atualizando}>
              <Upload className="mr-2 h-4 w-4 shrink-0" /> {extraindo ? "Lendo PDF..." : "Enviar PDF do LinkedIn"}
            </Button>
            <p className="text-xs text-muted-foreground">No LinkedIn: seu perfil → Mais → Salvar como PDF</p>
            {pdfErro && <p role="alert" className="text-sm text-destructive">{pdfErro}</p>}
          </div>
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">Ver texto completo do PDF</summary>
            <Label htmlFor="linkedin_pdf">Texto do PDF do LinkedIn</Label>
            <Textarea id="linkedin_pdf" maxLength={12000} rows={6} value={campos.linkedin_pdf}
              onChange={(event) => setCampos((previous) => ({ ...previous, linkedin_pdf: event.target.value }))} />
          </details>
          {([
            ["linkedin_headline", "Headline atual"],
            ["linkedin_resumo", "Resumo (Sobre)"],
            ["linkedin_experiencias", "Experiências"],
          ] as const).map(([key, label]) => <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Textarea id={key} maxLength={3000} rows={key === "linkedin_headline" ? 2 : 4}
              value={campos[key]} onChange={(e) => setCampos((previous) => ({ ...previous, [key]: e.target.value }))} />
          </div>)}
          <Button className="h-auto min-h-9 whitespace-normal text-left" onClick={salvarPerfil} disabled={salvando || atualizando || extraindo}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar e atualizar diagnóstico"}
          </Button>
        </CardContent>
      </Card>
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
