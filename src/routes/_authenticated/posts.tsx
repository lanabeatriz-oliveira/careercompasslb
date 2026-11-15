import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { POLLING_INTERVAL_MS, postsChanged } from "@/lib/make-integration";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { dispararWebhookMake } from "@/lib/webhook.functions";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Pencil, RefreshCw, Sparkles, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/posts")({
  head: () => pageMeta("Posts — Carreiras", "Revise, edite e agende seus posts de personal branding no Carreiras."),
  component: PostsPage,
});

type Post = {
  id: string;
  tema: string;
  hook: string;
  corpo: string;
  cta: string;
  formato: "texto" | "carrossel" | "imagem";
  visual_sugestao: string | null;
  status: "pendente_revisao" | "aprovado" | "rejeitado" | "aprovado_editado";
  data_agendamento: string | null;
};

const STATUS_LABEL: Record<Post["status"], string> = {
  pendente_revisao: "Pendente de revisão",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  aprovado_editado: "Aprovado (editado)",
};

const FILTROS = ["todos", "pendente_revisao", "aprovado", "aprovado_editado", "rejeitado"] as const;

function PostsPage() {
  const disparar = useServerFn(dispararWebhookMake);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("todos");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [aprovandoId, setAprovandoId] = useState<string | null>(null);
  const [aprovandoEditado, setAprovandoEditado] = useState(false);
  const [dataEscolhida, setDataEscolhida] = useState<Date | undefined>(new Date());
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const busyRef = useRef(false);
  busyRef.current = !!editandoId || !!aprovandoId || !!regenerandoId;

  async function carregar() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    let active = true;
    let fetching = false;
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible" || fetching) return;
      fetching = true;
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user || !active) return;
        const { data, error } = await supabase.from("posts").select("*")
          .eq("user_id", u.user.id).order("created_at", { ascending: false });
        if (error || !data || !active || busyRef.current || document.visibilityState !== "visible") return;
        setPosts((previous) => postsChanged(previous, data) ? data as Post[] : previous);
      } catch {
        // Silent refresh: retain the last successful list on transient failures.
      } finally {
        fetching = false;
      }
    }, POLLING_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const filtrados = filtro === "todos" ? posts : posts.filter((p) => p.status === filtro);

  function abrirAprovar(id: string, editado = false) {
    setAprovandoId(id);
    setAprovandoEditado(editado);
    setDataEscolhida(new Date());
  }

  async function confirmarAprovar() {
    if (!aprovandoId || !dataEscolhida) return;
    const novoStatus: Post["status"] = aprovandoEditado ? "aprovado_editado" : "aprovado";
    const payload: {
      status: Post["status"];
      data_agendamento: string;
      corpo?: string;
    } = {
      status: novoStatus,
      data_agendamento: dataEscolhida.toISOString().slice(0, 10),
    };
    if (aprovandoEditado && editandoId === aprovandoId) {
      payload.corpo = textoEditado;
    }
    const { error } = await supabase.from("posts").update(payload).eq("id", aprovandoId);
    if (error) {
      toast.error("Erro ao aprovar.");
      return;
    }
    toast.success(aprovandoEditado ? "Post editado e agendado!" : "Post aprovado e agendado!");
    setAprovandoId(null);
    setEditandoId(null);
    setTextoEditado("");
    carregar();
  }

  async function rejeitar(id: string) {
    const { error } = await supabase.from("posts").update({ status: "rejeitado" }).eq("id", id);
    if (error) return toast.error("Erro ao rejeitar.");
    toast.success("Post rejeitado.");
    carregar();
  }

  function abrirEditar(p: Post) {
    setEditandoId(p.id);
    setTextoEditado(p.corpo);
  }

  function abrirRegenerar(id: string) {
    setRegenerandoId(id);
    setMotivo("");
  }

  async function confirmarRegenerar() {
    if (!regenerandoId) return;
    const r = await disparar({
      data: { evento: "regenerar_post", payload: { post_id: regenerandoId, motivo } },
    });
    if (r.ok) {
      toast.success("Regeneração solicitada.");
    } else if (r.motivo === "webhook_nao_configurado") {
      toast.error("A integração com o Make.com ainda não está configurada.");
    } else {
      toast.error("Não conseguimos solicitar.");
    }
    setRegenerandoId(null);
    setMotivo("");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-semibold">Seus posts</h1>
        <p className="text-sm text-muted-foreground">Revise, edite e agende cada peça.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {FILTROS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? "default" : "outline"}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : STATUS_LABEL[f as Post["status"]]}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="font-medium">Nenhum post aqui ainda</p>
            <p className="text-sm text-muted-foreground">
              Volte ao Diagnóstico e clique em "Gerar posts" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtrados.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{p.tema}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {p.formato}
                    </Badge>
                    <Badge
                      variant={
                        p.status === "aprovado" || p.status === "aprovado_editado"
                          ? "default"
                          : p.status === "rejeitado"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                  {p.data_agendamento && (
                    <span className="text-xs text-muted-foreground">
                      Agendado: {new Date(p.data_agendamento).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-display text-lg font-semibold">{p.hook}</p>
                {editandoId === p.id ? (
                  <Textarea
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    rows={8}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{p.corpo}</p>
                )}
                <p className="text-sm font-medium">CTA: {p.cta}</p>
                {p.visual_sugestao && (
                  <div className="rounded-lg border bg-secondary/50 p-3 text-sm">
                    <span className="font-medium">Sugestão visual: </span>
                    <span className="text-muted-foreground">{p.visual_sugestao}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {editandoId === p.id ? (
                    <>
                      <Button size="sm" onClick={() => abrirAprovar(p.id, true)}>
                        <Check className="mr-1 h-4 w-4" /> Salvar e agendar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditandoId(null);
                          setTextoEditado("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => abrirAprovar(p.id, false)}>
                        <Check className="mr-1 h-4 w-4" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejeitar(p.id)}>
                        <X className="mr-1 h-4 w-4" /> Rejeitar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => abrirEditar(p)}>
                        <Pencil className="mr-1 h-4 w-4" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => abrirRegenerar(p.id)}>
                        <RefreshCw className="mr-1 h-4 w-4" /> Regenerar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo Aprovar / escolher data */}
      <Dialog open={!!aprovandoId} onOpenChange={(o) => !o && setAprovandoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha a data de publicação</DialogTitle>
            <DialogDescription>Quando você quer que esse post vá ao ar?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={dataEscolhida}
              onSelect={setDataEscolhida}
              className="pointer-events-auto rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAprovandoId(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovar} disabled={!dataEscolhida}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Regenerar */}
      <Dialog open={!!regenerandoId} onOpenChange={(o) => !o && setRegenerandoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerar post</DialogTitle>
            <DialogDescription>
              Explique (opcional) o que você quer diferente. Vamos enviar para o Make.com.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: quero um tom mais leve, incluir uma métrica..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegenerandoId(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRegenerar}>
              <RefreshCw className="mr-1 h-4 w-4" /> Regenerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
