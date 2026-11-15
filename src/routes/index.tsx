import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Calendar, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => pageMeta("Carreiras — LinkedIn e recolocação profissional", "Melhore seu perfil no LinkedIn e prepare posts de personal branding com Carreiras."),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="font-display text-lg font-semibold">Carreiras</span>
          </div>
          <Button asChild variant="ghost">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Para profissionais CLT em recolocação
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Turbine seu LinkedIn e construa autoridade com IA.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Diagnóstico do seu perfil, posts prontos de personal branding e um
            calendário editorial que trabalha por você.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Começar agora <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: LineChart,
              title: "Diagnóstico do perfil",
              desc: "Nota geral e por categoria com comentários acionáveis.",
            },
            {
              icon: Sparkles,
              title: "Posts com sua voz",
              desc: "Sugestões de hook, corpo, CTA e formato prontos para revisar.",
            },
            {
              icon: Calendar,
              title: "Calendário editorial",
              desc: "Agende os aprovados e visualize o mês inteiro.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
