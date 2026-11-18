import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CadenciaConfigSchema, quantidadeCadencia, type Cadencia } from "@/lib/cadencia";
import { toast } from "sonner";

export function useCadencia() {
  const [config, setConfig] = useState<{ cadencia: Cadencia; quantidade: number }>({ cadencia: "semanal", quantidade: 3 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sessão indisponível");
        const { data, error } = await supabase.from("configuracoes").select("cadencia, quantidade").eq("user_id", u.user.id).single();
        if (error || !data) throw error;
        if (active) setConfig(data);
      } catch { if (active) { setError(true); toast.error("Não conseguimos carregar sua cadência. Reabra a página para tentar novamente."); } }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  async function persist(value = config) {
    if (loading || error) throw new Error("Cadência indisponível");
    const parsed = CadenciaConfigSchema.parse(value);
    const operation = queue.current.catch(() => {}).then(async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão indisponível");
      const { data, error } = await supabase.from("configuracoes").update(parsed).eq("user_id", u.user.id).select("user_id").single();
      if (error || !data) throw error ?? new Error("Configuração indisponível");
    });
    queue.current = operation;
    await operation;
  }
  function change(cadencia: Cadencia, quantidade = config.quantidade) {
    const next = { cadencia, quantidade: quantidadeCadencia(cadencia, quantidade) };
    setConfig(next);
    if (!CadenciaConfigSchema.safeParse(next).success) return;
    setSaving(true);
    persist(next).catch(() => toast.error("Não conseguimos salvar a cadência. Tente novamente antes de gerar posts.")).finally(() => setSaving(false));
  }
  return { ...config, loading, saving, error, change, persist, valid: CadenciaConfigSchema.safeParse(config).success };
}