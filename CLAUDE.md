# CLAUDE.md

> Contexto do projeto para agentes. Leia este arquivo antes de qualquer tarefa.

## O que é este projeto
Ferramenta de gravação de tela que exporta em **GIF** e **MP4**.
Bugs costumam aparecer só durante o uso real (timing, encoding, último frame, sincronização de áudio/vídeo).

## Stack
- Framework: React 19 + Vite 8
- Linguagem: TypeScript
- Captura: `getDisplayMedia()` → `MediaRecorder` (webm/VP9), sem áudio
- Render: Canvas + WebCodecs (`VideoDecoder`/`VideoEncoder`) — alvo Chrome/Edge
- Encoding: GIF via `gifenc`; MP4 via `VideoEncoder` (H.264) + `mp4-muxer`
- Engine de render: módulo TS isolado em `src/engine/` (desacoplado do React)
- Testes: Vitest
- Deploy: GitHub (`bqdesigner/recorder-awesome`) → Vercel (deploy automático no merge para `main`)

## Comandos
- Instalar: `npm install`
- Dev local: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build`)
- Testes: `npm test` (`vitest run`)
- Lint: `npm run lint`

> Regra: `npm test` e `npm run lint` precisam passar limpo ANTES de abrir qualquer PR.

## Convenções de branch
- Bug: `fix/<slug-curto>` (ex: `fix/gif-ultimo-frame`)
- Feature: `feat/<slug-curto>`
- Sempre criar a partir de `main` atualizada.

## Convenção de commit
- Formato: `tipo: descrição no imperativo` (ex: `fix: corrige corte do último frame no GIF acima de 10s`)
- Um commit por unidade lógica. Sem commits "wip" no PR final.

## Como testar exportação (CRÍTICO)
A parte mais frágil do produto. Separe sempre o que é automatizável do que é manual.

### Automatizável (o agente DEVE cobrir)
- Lógica de timing e cálculo de frames (duração → nº de frames esperado)
- Funções puras de encoding/configuração (resolução, fps, qualidade)
- Estados da máquina de gravação (idle → recording → processing → done)
- Validação de inputs e tratamento de erro

### Manual (o agente NÃO consegue validar — deixar checklist no PR)
- Abrir o GIF/MP4 exportado e confirmar visualmente que está íntegro
- Último frame presente, sem corte
- Sincronia de áudio (se aplicável)
- Tamanho de arquivo razoável
- Comportamento em gravações longas (>10s, >30s)

> Quando o critério de aceite envolve "o arquivo exportado fica correto", o agente escreve o que dá pra automatizar E lista os passos manuais de verificação no corpo do PR. Nunca marca como testado o que só o humano vê.

## Limites do agente (regras duras)
1. **NUNCA** mover task para "Concluído". Só o humano faz isso — mover para "Concluído" é a **autorização** para o merge.
2. Merge/deploy **só** quando a task já estiver em "Concluído" (gate do item 1). Nesse caso o agente faz **squash merge** do PR na `main` (`gh pr merge --squash --delete-branch`), o que dispara deploy automático na Vercel. **Fora desse gate, NUNCA dar merge nem deploy.**
3. **NUNCA** commitar direto em `main`. **NUNCA** forçar merge com checks vermelhos, conflito ou branch protegida — nesses casos, parar e reportar.
4. Sem autorização (task ainda não em "Concluído"), o fluxo termina em "Em revisão" com PR aberto e checklist manual preenchido.
