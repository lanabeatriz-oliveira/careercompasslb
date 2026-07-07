
-- Enums
CREATE TYPE public.post_formato AS ENUM ('texto', 'carrossel', 'imagem');
CREATE TYPE public.post_status AS ENUM ('pendente_revisao', 'aprovado', 'rejeitado', 'aprovado_editado');
CREATE TYPE public.cadencia AS ENUM ('semanal', 'quinzenal', 'mensal', 'personalizado');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- perfis_contexto
CREATE TABLE public.perfis_contexto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_contexto TO authenticated;
GRANT ALL ON public.perfis_contexto TO service_role;
ALTER TABLE public.perfis_contexto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own perfis" ON public.perfis_contexto FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON public.perfis_contexto
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notas
CREATE TABLE public.notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nota_geral numeric(3,1) NOT NULL,
  headline_nota numeric(3,1) NOT NULL,
  headline_comentario text NOT NULL,
  resumo_nota numeric(3,1) NOT NULL,
  resumo_comentario text NOT NULL,
  experiencia_nota numeric(3,1) NOT NULL,
  experiencia_comentario text NOT NULL,
  atividade_nota numeric(3,1) NOT NULL,
  atividade_comentario text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas TO authenticated;
GRANT ALL ON public.notas TO service_role;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notas" ON public.notas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notas_user ON public.notas(user_id, created_at DESC);

-- posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema text NOT NULL,
  hook text NOT NULL,
  corpo text NOT NULL,
  cta text NOT NULL,
  formato public.post_formato NOT NULL DEFAULT 'texto',
  visual_sugestao text,
  status public.post_status NOT NULL DEFAULT 'pendente_revisao',
  data_agendamento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own posts" ON public.posts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_posts_user_status ON public.posts(user_id, status);
CREATE INDEX idx_posts_user_data ON public.posts(user_id, data_agendamento);
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- configuracoes
CREATE TABLE public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cadencia public.cadencia NOT NULL DEFAULT 'semanal',
  quantidade integer NOT NULL DEFAULT 3 CHECK (quantidade >= 1 AND quantidade <= 12),
  webhook_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own configuracoes" ON public.configuracoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger que cria configuração default no signup
CREATE OR REPLACE FUNCTION public.handle_new_user_configuracoes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.configuracoes (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_configuracoes
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_configuracoes();
