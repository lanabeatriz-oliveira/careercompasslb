# Plano — App Carreiras

App web para recolocação profissional (CLT) com onboarding conversacional, diagnóstico de LinkedIn, geração de posts via webhook Make.com, calendário editorial e configurações de cadência.

## Stack e infraestrutura

- TanStack Start (template já configurado).
- Lovable Cloud (Supabase) para banco, auth e server functions.
- Login: e-mail/senha + Google (via `lovable.auth.signInWithOAuth`).
- Chamadas ao Make.com em `createServerFn` (URL lida da tabela de configurações do usuário).

## Design

- Paleta neutra azul/branco: fundo branco, superfície `#F8FAFC`, primária `#1E40AF`, acento `#3B82F6`, texto `#0F172A`, muted `#64748B`.
- Tipografia: Figtree (títulos) + Inter (corpo) via `@fontsource`.
- shadcn/ui, cantos suaves (radius 12), sombras discretas, foco em legibilidade para público não-técnico.
- Shell autenticado com sidebar: Diagnóstico, Posts, Calendário, Configurações.

## Rotas

```
src/routes/
  __root.tsx
  index.tsx                      -> landing curta + CTA login
  auth.tsx                       -> login/cadastro (email+senha, Google)
  _authenticated/
    route.tsx                    -> gate (gerenciado pela integração)
    onboarding.tsx               -> chat de onboarding
    diagnostico.tsx              -> notas mock
    posts.tsx                    -> lista de posts + ações
    calendario.tsx               -> visualização mensal
    configuracoes.tsx            -> cadência + URL do webhook
```

Após login: se não houver `perfis_contexto` do usuário → `/onboarding`; senão → `/diagnostico`.

## Banco de dados (Supabase)

Todas com RLS (`auth.uid() = user_id`) e GRANTs para `authenticated`.

- `perfis_contexto`: `id`, `user_id unique`, `respostas jsonb`, `concluido_em`.
- `notas`: `id`, `user_id`, `nota_geral`, mais 4 pares `<categoria>_nota` / `<categoria>_comentario` (Headline/Foto, Resumo, Experiência, Atividade), `created_at`.
- `posts`: `id`, `user_id`, `tema`, `hook`, `corpo`, `cta`, `formato` (enum: texto, carrossel, imagem), `visual_sugestao`, `status` (enum: pendente_revisao, aprovado, rejeitado, aprovado_editado), `data_agendamento date null`, timestamps.
- `configuracoes`: `id`, `user_id unique`, `cadencia` (enum: semanal, quinzenal, mensal, personalizado), `quantidade int` (≤12), `webhook_url text`, `updated_at`.

Enums via `CREATE TYPE`. Trigger `handle_new_user` cria linha default em `configuracoes` no signup.

## Telas

**1. Auth (`/auth`)** — card com abas Entrar/Cadastrar, campos email/senha (validação Zod), botão "Continuar com Google".

**2. Onboarding (`/onboarding`)** — chat com bolhas, 6 perguntas sequenciais:
1. Cargo-alvo
2. Setor/indústria
3. Maior conquista recente (placeholder pedindo métrica)
4. Diferencial
5. Tom de voz (4 chips; "outro" abre input)
6. Temas (até 3 tags)

Ao finalizar: salva `perfis_contexto.respostas` (JSON), dispara webhook Make com `{ evento: 'onboarding_concluido', ... }`, insere linha mock em `notas`, redireciona para `/diagnostico`.

**3. Diagnóstico (`/diagnostico`)** — card com nota geral (0–10, anel visual) + 4 cards de categoria com nota e comentário. Botão "Gerar posts" chama server fn que dispara webhook Make `{ evento: 'gerar_posts', quantidade, contexto }`.

**4. Posts (`/posts`)** — cards com tema, hook em destaque, corpo, CTA, badge de formato, bloco "Sugestão visual". Ações:
- **Aprovar**: abre date picker → status `aprovado` + `data_agendamento`.
- **Rejeitar**: status `rejeitado`.
- **Editar**: dialog com textarea → salva com status `aprovado_editado` + date picker.
- **Regenerar**: dialog com motivo (opcional) → dispara webhook `{ evento: 'regenerar_post', post_id, motivo }`; post permanece `pendente_revisao`.

Filtro por status; empty state com CTA "Gerar posts".

**5. Calendário (`/calendario`)** — grid mensal 7 colunas. Mostra posts `aprovado`/`aprovado_editado` na `data_agendamento`. Click no dia abre drawer com posts do dia. Navegação mês anterior/próximo.

**6. Configurações (`/configuracoes`)** —
- Radio de cadência: Semanal (3), Quinzenal (5), Mensal (9), Personalizado (input 1–12).
- Input "URL do Webhook Make.com".
- Botão salvar → persiste em `configuracoes`.

## Webhook Make.com

Server function `dispararWebhook({ evento, payload })`:
1. Lê `configuracoes.webhook_url` do usuário.
2. Se vazio → retorna aviso, não bloqueia fluxo.
3. `POST` JSON `{ evento, user_id, timestamp, ...payload }`.
4. Erros logados server-side; UI mostra toast genérico.

Eventos: `onboarding_concluido`, `gerar_posts`, `regenerar_post`.

Também expõe `POST /api/public/posts-callback` protegido por segredo compartilhado (`MAKE_CALLBACK_SECRET`, gerado via `generate_secret`) para o Make gravar posts de volta em `posts`.

## Detalhes técnicos

- Zod em todos os formulários e `inputValidator` de server fns.
- Bearer middleware da integração Lovable Supabase já registrado.
- Leituras via `useSuspenseQuery` + loaders; mutations com `invalidateQueries`.
- Toaster (sonner) para feedback.
- Head metadata próprio por rota.

## Ordem de execução

1. Habilitar Lovable Cloud.
2. Migration: enums, 4 tabelas, RLS, GRANTs, trigger de default em `configuracoes`.
3. `generate_secret` para `MAKE_CALLBACK_SECRET`.
4. Configurar Google OAuth (`supabase--configure_social_auth`).
5. Fontes (`@fontsource/figtree`, `@fontsource/inter`) e tokens em `styles.css`.
6. Shell autenticado com sidebar + tela de auth.
7. Onboarding em chat + persistência + webhook + mock de notas.
8. Diagnóstico + botão "Gerar posts".
9. Tela de Posts (ações completas) + endpoint callback.
10. Calendário mensal.
11. Configurações (cadência + URL do webhook).
12. Verificação de build + smoke test das rotas.
