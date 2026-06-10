---
description: Lê o backlog no Notion, executa o fluxo até Revisão e faz o merge após o humano mover a task para Concluído
---

# /work-backlog

Você é o executor do fluxo Notion → código → PR → merge. Siga os passos em ordem e **pare em qualquer falha** seguindo a regra de rollback.

O fluxo tem dois gatilhos:
- **Backlog → Em revisão** (Passos 1–6): pegar uma task nova e levá-la até o PR.
- **Concluído → merge** (Passo 7): quando o humano move uma task para `Concluído`, fazer o merge do PR dela.

No início, decidir qual gatilho atende: se houver task(s) em `Concluído` com PR aberto/não-mergeado, oferecer o Passo 7; caso contrário, seguir o fluxo normal a partir do Passo 1.

## Pré-condições
- Ler o `CLAUDE.md` da raiz do repositório antes de começar.
- MCPs necessários: Notion, GitHub. Se não estiverem disponíveis, abortar e avisar.

## Passo 1 — Ler o backlog
- Buscar no board do Notion apenas tasks com `Status = Backlog`.
- **REGRA DE IDEMPOTÊNCIA (dura):** filtrar estritamente por `Status = Backlog`. Nunca pegar task que já esteja em "Em andamento", "Em revisão" ou "Concluído" para **codar**. Isso evita pegar a mesma task duas vezes. (Exceção: o Passo 7 toca uma task em "Concluído", mas só para **mergear** o PR dela — nunca para reabrir/codar.)
- Se houver mais de uma, listar título + resumo e perguntar qual atacar. Se houver só uma, confirmar antes de prosseguir.
- Se o backlog estiver vazio, avisar e encerrar.

## Passo 2 — Analisar
- Ler o description completo da task (formato PRD técnico).
- Se faltar Critérios de aceite ou Definição de teste, **não chutar**: perguntar antes de codar.
- Resumir em 3-4 linhas o que entendeu e o plano de ataque.

## Passo 3 — Lock + branch
- Mover a task para `Status = Em andamento` **ANTES de escrever qualquer código** (isso é o lock natural).
- Criar branch a partir de `main` atualizada, seguindo a convenção do CLAUDE.md (`fix/` ou `feat/`).
- Gravar o nome da branch na propriedade `Branch` da task no Notion.

## Passo 4 — Implementar
- Mexer apenas nos arquivos dentro do escopo definido. Respeitar "Fora de escopo".
- Seguir convenções de commit do CLAUDE.md.

## Passo 5 — Testar
- Escrever os testes automatizáveis conforme os critérios de aceite.
- Rodar `npm test` e `npm run lint`. Ambos precisam passar.
- Para o que NÃO é automatizável (verificação visual de GIF/MP4), montar um checklist manual.

## Passo 6 — PR + Revisão
- Abrir PR contra `main` com:
  - Descrição do que foi feito
  - Link para a task do Notion
  - **Checklist de verificação manual** (o que o humano precisa abrir e conferir)
- Gravar o link do PR na propriedade `PR link` da task.
- Mover a task para `Status = Em revisão`.
- Reportar no chat: branch, PR, e o checklist manual pendente.

## Passo 7 — Merge (após o humano mover para "Concluído")
**Gate de autorização:** só executar se a task está em `Status = Concluído`. Mover para "Concluído" é ação exclusiva do humano e é o que autoriza o merge. O agente NUNCA move para "Concluído".

- Ler o `PR link` da task. Confirmar com `gh pr view <n>` que o PR está **aberto** e **mergeable** (sem conflito; checks/CI verdes se houver).
- Se o PR já estiver mergeado ou fechado: não fazer nada, só reportar o estado.
- Fazer **squash merge** deletando a branch: `gh pr merge <n> --squash --delete-branch`.
- Atualizar a `main` local: `git checkout main && git pull --ff-only`.
- O merge na `main` **dispara deploy automático na Vercel**. Reportar no chat: PR mergeado + que o deploy foi disparado.
- **Não** mexer no Status (a task já está em "Concluído", que é o estado final do humano).

### Rollback do Passo 7 (dura)
Se o merge falhar (conflito, checks vermelhos, branch protegida, erro de API):
1. **NÃO** forçar o merge nem commitar direto em `main`.
2. Reportar claramente o motivo da falha e deixar a decisão para o humano.
3. A task permanece em "Concluído"; o PR permanece aberto.

## Regra de rollback em caso de erro (dura)
Se qualquer passo entre Passo 4 e Passo 6 falhar (build quebra, teste não passa, erro de API, etc.):
1. **NÃO** deixar a task travada em "Em andamento".
2. Mover a task de volta para `Status = Backlog`.
3. Reportar claramente o que falhou e em qual passo.
4. Não deixar branch órfã sem aviso: se a branch foi criada, mencionar o nome para limpeza manual.

## Limites (nunca violar)
- Nunca **mover** uma task para "Concluído" — isso é do humano e funciona como autorização para o merge.
- Merge/deploy **só** com a task em "Concluído" (gate do Passo 7). Fora disso, o fluxo termina em "Em revisão".
- Nunca commitar direto em `main`. Nunca forçar merge com checks vermelhos, conflito ou branch protegida.
