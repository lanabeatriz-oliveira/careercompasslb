import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => pageMeta("Calendário — Carreiras", "Acompanhe as datas de publicação dos seus posts aprovados no calendário editorial."),
  component: CalendarioPage,
});

type Post = {
  id: string;
  tema: string;
  hook: string;
  corpo: string;
  formato: string;
  data_agendamento: string;
  status: string;
};

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function CalendarioPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [posts, setPosts] = useState<Post[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const primeiro = new Date(ano, mes, 1).toISOString().slice(0, 10);
      const ultimo = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("posts")
        .select("id, tema, hook, corpo, formato, data_agendamento, status")
        .eq("user_id", u.user.id)
        .in("status", ["aprovado", "aprovado_editado"])
        .not("data_agendamento", "is", null)
        .gte("data_agendamento", primeiro)
        .lte("data_agendamento", ultimo);
      setPosts((data ?? []) as Post[]);
    })();
  }, [mes, ano]);

  const porDia = useMemo(() => {
    const m: Record<string, Post[]> = {};
    posts.forEach((p) => {
      if (!m[p.data_agendamento]) m[p.data_agendamento] = [];
      m[p.data_agendamento].push(p);
    });
    return m;
  }, [posts]);

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: Array<{ dia: number | null; data?: string }> = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push({ dia: null });
  for (let d = 1; d <= diasNoMes; d++) {
    const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    celulas.push({ dia: d, data });
  }
  while (celulas.length % 7 !== 0) celulas.push({ dia: null });

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAno(ano - 1); } else setMes(mes - 1);
  }
  function proxMes() {
    if (mes === 11) { setMes(0); setAno(ano + 1); } else setMes(mes + 1);
  }

  const postsDoDia = diaSelecionado ? porDia[diaSelecionado] ?? [] : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-semibold">Calendário editorial</h1>
        <p className="text-sm text-muted-foreground">Seus posts aprovados por data.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={mesAnterior}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-display text-xl font-semibold">
              {MESES[mes]} de {ano}
            </h2>
            <Button variant="ghost" size="sm" onClick={proxMes}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((c, i) => {
              const eventos = c.data ? porDia[c.data] ?? [] : [];
              const isHoje =
                c.data ===
                `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
              return (
                <button
                  key={i}
                  disabled={!c.dia}
                  onClick={() => c.data && setDiaSelecionado(c.data)}
                  className={`min-h-20 rounded-lg border p-1.5 text-left text-xs transition-colors ${
                    !c.dia
                      ? "invisible"
                      : eventos.length > 0
                        ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-secondary"
                  } ${isHoje ? "ring-1 ring-primary" : ""}`}
                >
                  <div className={`mb-1 font-medium ${isHoje ? "text-primary" : ""}`}>{c.dia}</div>
                  <div className="space-y-0.5">
                    {eventos.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded bg-primary px-1 py-0.5 text-[10px] text-primary-foreground"
                      >
                        {e.tema}
                      </div>
                    ))}
                    {eventos.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{eventos.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!diaSelecionado} onOpenChange={(o) => !o && setDiaSelecionado(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {diaSelecionado && new Date(diaSelecionado + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </SheetTitle>
            <SheetDescription>
              {postsDoDia.length === 0 ? "Nenhum post agendado." : `${postsDoDia.length} post(s) agendado(s)`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {postsDoDia.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{p.tema}</Badge>
                    <Badge variant="outline" className="capitalize">{p.formato}</Badge>
                  </div>
                  <p className="font-medium">{p.hook}</p>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{p.corpo}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
