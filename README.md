# Career Compass AI

Quero criar um aplicativo web chamado [Carreiras] para ajudar pessoas em

processo de recolocação profissional (CLT) a melhorarem seu perfil no LinkedIn

e gerarem posts de personal branding com ajuda de IA.

O aplicativo precisa ter:

1. TELA DE LOGIN/CADASTRO (padrão, com e-mail e senha).

2. TELA DE ONBOARDING (chat): uma conversa em formato de chat onde o app faz

   perguntas ao usuário, uma de cada vez, sobre:

   - Cargo-alvo que está buscando

   - Setor/indústria de interesse

   - Maior conquista profissional recente (com pedido de número/métrica, se

     houver)

   - O que diferencia essa pessoa de outros candidatos

   - Tom de voz preferido (oferecer 4 opções: "direto e técnico", "caloroso e

     storytelling", "analítico com dados", "outro")

   - Temas que a pessoa quer ser associada nos posts (até 3 temas)

   Ao final da conversa, salve todas as respostas em uma tabela chamada

   perfis_contexto, no formato JSON, associada ao usuário logado.

3. TELA DE NOTA/DIAGNÓSTICO: mostra uma nota geral (0 a 10) e 4 notas por

   categoria (Headline e Foto, Resumo, Experiência, Atividade/Consistência),

   cada uma com uma nota e um comentário de diagnóstico em texto. Os dados

   vêm de uma tabela chamada notas.

4. TELA DE POSTS: lista de posts gerados, cada um mostrando: tema, hook

   (primeira linha), corpo do texto, CTA final, sugestão de formato (texto

   simples, carrossel, ou imagem única) e a sugestão de conteúdo visual em

   texto. Cada post deve ter 4 botões: Aprovar, Rejeitar, Editar (abre o texto

   para edição manual) e Regenerar (com um campo opcional de texto livre para

   o usuário explicar o motivo do ajuste). Os dados vêm de uma tabela chamada

   posts, com um campo de status (pendente_revisao, aprovado, rejeitado,

   aprovado_editado).

5. TELA DE CALENDÁRIO: mostra os posts com status "aprovado" ou

   "aprovado_editado" organizados por data de agendamento, em formato de

   calendário mensal.

6. TELA DE CONFIGURAÇÕES: onde o usuário escolhe a cadência de geração de

   posts (semanal = 3 posts, quinzenal = 5 posts, mensal = 9 posts, ou

   personalizado = usuário digita a quantidade, com limite máximo de 12).

Quando o usuário terminar o onboarding, ou clicar em "Gerar posts", ou clicar

em "Regenerar" em um post, o app precisa enviar essa informação para um

webhook externo (vou te passar a URL exata depois — por enquanto, crie um

campo de configuração no projeto chamado "URL do Webhook Make.com" onde eu

possa colar esse endereço depois).

Use um design limpo, profissional, com paleta de cores neutra (tons de azul

e branco), pensado para uma pessoa não-técnica usar sem confusão.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://careercompasslb.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8dd8c17a-f249-42cd-a913-a253d5dd4391).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
