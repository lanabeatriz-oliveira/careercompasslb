import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Carreiras" }] }),
  component: ConfiguracoesPage,
});

type Cadencia = "semanal" | "quinzenal" | "mensal" | "personalizado";

const PADRAO: Record<Exclude<Cadencia, "personalizado">, number> = {
  semanal: 3,
  quinzenal: 5,
  mensal: 9,
};

function ConfiguracoesPage() {
  const [cadencia, setCadencia] = useState<Cadencia>("semanal");
  const [quantidade, setQuantidade] = useState<number>(3);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        setCadencia(data.cadencia);
        setQuantidade(data.quantidade);
        setWebhookUrl(data.webhook_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  function trocarCadencia(c: Cadencia) {
    setCadencia(c);
    if (c !== "personalizado") setQuantidade(PADRAO[c]);
  }

  async function salvar() {
    if (quantidade < 1 || quantidade > 12) {
      toast.error("Quantidade deve estar entre 1 e 12.");
      return;
    }
    if (webhookUrl && !/^https?:\/\//i.test(webhookUrl)) {
      toast.error("A URL do webhook deve começar com http:// ou https://");
      return;
    }
    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("configuracoes")
      .update({
        cadencia,
        quantidade,
        webhook_url: webhookUrl || null,
      })
      .eq("user_id", u.user.id);
    setSalvando(false);
    if (error) return toast.error("Erro ao salvar.");
    toast.success("Configurações salvas!");
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajuste sua cadência e integração.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadência de geração</CardTitle>
          <CardDescription>Quantos posts você quer receber a cada rodada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={cadencia} onValueChange={(v) => trocarCadencia(v as Cadencia)}>
            {(["semanal", "quinzenal", "mensal", "personalizado"] as Cadencia[]).map((c) => (
              <div key={c} className="flex items-center gap-3 rounded-lg border p-3">
                <RadioGroupItem value={c} id={c} />
                <Label htmlFor={c} className="flex-1 cursor-pointer capitalize">
                  {c === "semanal" && "Semanal — 3 posts"}
                  {c === "quinzenal" && "Quinzenal — 5 posts"}
                  {c === "mensal" && "Mensal — 9 posts"}
                  {c === "personalizado" && "Personalizado"}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {cadencia === "personalizado" && (
            <div className="space-y-1.5">
              <Label htmlFor="qtd">Quantidade (1 a 12)</Label>
              <Input
                id="qtd"
                type="number"
                min={1}
                max={12}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>URL do Webhook Make.com</CardTitle>
          <CardDescription>
            Cole aqui o endereço do seu cenário no Make. É para lá que enviamos os pedidos de
            geração e regeneração de posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="https://hook.make.com/xxxxxxxx"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando} size="lg">
          {salvando ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
