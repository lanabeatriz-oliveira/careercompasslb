import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { dispararWebhookMake } from "@/lib/webhook.functions";
import { useServerFn } from "@tanstack/react-start";
import { Send, X } from "lucide-react";
import { mergeOnboarding, onboardingSearch, savedAnswers, shouldRedirectOnboarding, type OnboardingAnswers } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => pageMeta("Onboarding — Carreiras", "Compartilhe seus objetivos profissionais para personalizar seu diagnóstico e conteúdo."),
  validateSearch: onboardingSearch,
  component: OnboardingChat,
});

type Etapa =
  | "cargo"
  | "setor"
  | "conquista"
  | "diferencial"
  | "outras_experiencias"
  | "tom"
  | "tom_outro"
  | "temas"
  | "finalizado";

type Respostas = OnboardingAnswers;

type Msg = { autor: "bot" | "user"; texto: string };

const PERGUNTAS: Record<Exclude<Etapa, "finalizado" | "tom_outro">, string> = {
  cargo: "Vamos começar. Qual é o cargo-alvo que você está buscando?",
  setor: "Ótimo! E qual setor ou indústria mais te interessa?",
  conquista:
    "Conta pra mim sua maior conquista profissional recente. Se puder, inclua um número ou métrica (ex: aumentei receita em 30%).",
  diferencial: "O que te diferencia de outros candidatos com perfil parecido?",
  outras_experiencias: "Quer contar outras experiências, projetos ou resultados que valem destacar (além da conquista que você já citou)? Pode listar vários, um por linha.",
  tom: "Qual tom de voz combina mais com você nos posts?",
  temas: "Por último, escolha até 3 temas que você quer ser associado(a). Digite separando por vírgula.",
};

const TONS = [
  { id: "direto_tecnico", label: "Direto e técnico" },
  { id: "caloroso_storytelling", label: "Caloroso e storytelling" },
  { id: "analitico_dados", label: "Analítico com dados" },
  { id: "outro", label: "Outro (descrever)" },
];

function OnboardingChat() {
  const navigate = useNavigate();
  const { refazer } = Route.useSearch();
  const disparar = useServerFn(dispararWebhookMake);
  const [etapa, setEtapa] = useState<Etapa>("cargo");
  const [respostas, setRespostas] = useState<Respostas>({});
  const [mensagens, setMensagens] = useState<Msg[]>([
    { autor: "bot", texto: "Oi! Vou te fazer algumas perguntinhas rápidas para personalizar seu conteúdo." },
    { autor: "bot", texto: PERGUNTAS.cargo },
  ]);
  const [entrada, setEntrada] = useState("");
  const [temas, setTemas] = useState<string[]>([]);
  const [entradaTema, setEntradaTema] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const envioRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, etapa]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão indisponível");
      const { data, error } = await supabase
        .from("perfis_contexto")
        .select("concluido_em, respostas")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) throw error;
      if (shouldRedirectOnboarding(!!data?.concluido_em, refazer)) {
        navigate({ to: "/diagnostico" });
        return;
      }
      if (refazer === "1" && data) {
        const saved = savedAnswers(data.respostas);
        setRespostas(saved);
        setEntrada(saved.cargo ?? "");
        setTemas(saved.temas ?? []);
      }
      } catch {
        if (active) { setErroCarga(true); toast.error("Não conseguimos carregar suas respostas. Reabra o onboarding para tentar novamente."); }
      } finally { if (active) setCarregando(false); }
    })();
    return () => { active = false; };
  }, [navigate, refazer]);

  function addMsg(autor: "bot" | "user", texto: string) {
    setMensagens((m) => [...m, { autor, texto }]);
  }

  function proximaEtapa(atual: Etapa): Etapa {
    const ordem: Etapa[] = ["cargo", "setor", "conquista", "diferencial", "outras_experiencias", "tom", "temas", "finalizado"];
    const i = ordem.indexOf(atual);
    return ordem[i + 1] ?? "finalizado";
  }

  async function submeterTexto() {
    const texto = entrada.trim();
    if (!texto || carregando || enviando) return;
    addMsg("user", texto);
    setEntrada("");

    if (etapa === "cargo") {
      setRespostas((r) => ({ ...r, cargo: texto }));
      const prox = proximaEtapa("cargo");
      setEtapa(prox);
      setEntrada(respostas.setor ?? "");
      addMsg("bot", PERGUNTAS.setor);
    } else if (etapa === "setor") {
      setRespostas((r) => ({ ...r, setor: texto }));
      setEtapa("conquista");
      setEntrada(respostas.conquista ?? "");
      addMsg("bot", PERGUNTAS.conquista);
    } else if (etapa === "conquista") {
      setRespostas((r) => ({ ...r, conquista: texto }));
      setEtapa("diferencial");
      setEntrada(respostas.diferencial ?? "");
      addMsg("bot", PERGUNTAS.diferencial);
    } else if (etapa === "diferencial") {
      setRespostas((r) => ({ ...r, diferencial: texto }));
      setEtapa("outras_experiencias");
      setEntrada(respostas.outras_experiencias ?? "");
      addMsg("bot", PERGUNTAS.outras_experiencias);
    } else if (etapa === "outras_experiencias") {
      setRespostas((r) => ({ ...r, outras_experiencias: texto }));
      setEtapa("tom");
      addMsg("bot", PERGUNTAS.tom);
    } else if (etapa === "tom_outro") {
      setRespostas((r) => ({ ...r, tom: texto }));
      setEtapa("temas");
      addMsg("bot", PERGUNTAS.temas);
    }
  }

  async function escolherTom(id: string, label: string) {
    addMsg("user", label);
    if (id === "outro") {
      setEtapa("tom_outro");
      setEntrada(respostas.tom ?? "");
      addMsg("bot", "Descreva em poucas palavras o tom que combina com você.");
      return;
    }
    setRespostas((r) => ({ ...r, tom: label }));
    setEtapa("temas");
    addMsg("bot", PERGUNTAS.temas);
  }

  function addTema() {
    const t = entradaTema.trim();
    if (!t || temas.length >= 3 || temas.includes(t)) return;
    setTemas([...temas, t]);
    setEntradaTema("");
  }

  async function finalizarTemas() {
    if (envioRef.current || carregando || erroCarga) return;
    if (temas.length === 0) {
      toast.error("Adicione pelo menos 1 tema.");
      return;
    }
    addMsg("user", temas.join(", "));
    const respostasFinais: Respostas = { ...respostas, temas };
    setRespostas(respostasFinais);
    setEnviando(true);
    envioRef.current = true;
    addMsg("bot", "Perfeito! Estou salvando suas respostas...");

    try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Sessão indisponível");
    const { data: perfil, error: readError } = await supabase.from("perfis_contexto")
      .select("respostas").eq("user_id", userData.user.id).maybeSingle();
    if (readError) throw readError;
    const completas = mergeOnboarding(perfil?.respostas ?? {}, respostasFinais);

    const { error: perfilErr } = await supabase
      .from("perfis_contexto")
      .upsert(
        {
          user_id: userData.user.id,
          respostas: completas,
          concluido_em: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (perfilErr) throw perfilErr;

    await Promise.allSettled([
      disparar({
        data: { evento: "onboarding_concluido", payload: { respostas: completas } },
      }),
      disparar({ data: { evento: "gerar_nota", payload: { respostas: completas } } }),
    ]);

    setEnviando(false);
    setEtapa("finalizado");
    addMsg("bot", "Tudo pronto! Vamos ver seu diagnóstico.");
    setTimeout(() => navigate({ to: "/diagnostico" }), 900);
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally { setEnviando(false); envioRef.current = false; }
  }

  const mostrarInputTexto =
    etapa === "cargo" ||
    etapa === "setor" ||
    etapa === "conquista" ||
    etapa === "diferencial" ||
    etapa === "outras_experiencias" ||
    etapa === "tom_outro";

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-113px)] min-h-0 w-full max-w-3xl flex-col p-4 md:h-dvh md:p-8">
      <div className="mb-4 shrink-0">
        <h1 className="font-display text-2xl font-semibold">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Uma conversa rápida para personalizar seu conteúdo.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card p-4"
      >
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.autor === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                m.autor === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.texto}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-4 shrink-0 pointer-events-auto">
        {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando suas respostas...</p> : erroCarga ? <p role="alert" className="text-sm text-destructive">Não conseguimos carregar suas respostas. Reabra esta página para tentar novamente.</p> : <>
        {etapa === "tom" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TONS.map((t) => (
              <Button key={t.id} variant="outline" onClick={() => escolherTom(t.id, t.label)}>
                {t.label}
              </Button>
            ))}
            {respostas.tom && <p className="text-sm text-muted-foreground sm:col-span-2">Tom salvo: {respostas.tom}</p>}
          </div>
        )}

        {etapa === "temas" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {temas.map((t) => (
                <Badge key={t} variant="secondary" className="max-w-full gap-1 whitespace-normal break-words">
                  {t}
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" aria-label={`Remover ${t}`} onClick={() => setTemas(temas.filter((x) => x !== t))}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                placeholder={temas.length >= 3 ? "Máximo 3 temas" : "Ex: liderança, dados, produto"}
                value={entradaTema}
                onChange={(e) => setEntradaTema(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTema())}
                disabled={temas.length >= 3}
              />
              <Button variant="outline" onClick={addTema} disabled={temas.length >= 3}>
                Adicionar
              </Button>
            </div>
            <Button className="w-full" onClick={finalizarTemas} disabled={enviando}>
              {enviando ? "Salvando..." : "Concluir onboarding"}
            </Button>
          </div>
        )}

        {mostrarInputTexto && (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            {etapa === "conquista" || etapa === "diferencial" || etapa === "outras_experiencias" ? (
              <Textarea
                placeholder="Digite sua resposta..."
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                rows={3}
              />
            ) : (
              <Input
                placeholder="Digite sua resposta..."
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submeterTexto())}
              />
            )}
            <Button aria-label="Enviar resposta" onClick={submeterTexto} disabled={!entrada.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
        {etapa === "outras_experiencias" && <Button variant="ghost" className="mt-2" onClick={() => {
          setRespostas((r) => ({ ...r, outras_experiencias: "" }));
          setEntrada("");
          addMsg("user", "Pular");
          setEtapa("tom");
          addMsg("bot", PERGUNTAS.tom);
        }}>Pular</Button>}
        </>}
      </div>
    </div>
  );
}
