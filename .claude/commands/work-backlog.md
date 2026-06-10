---
description: Lê o backlog no Notion, escolhe uma task e executa o fluxo até Revisão
---

# /work-backlog

Você é o executor do fluxo Notion → código → PR. Siga os passos em ordem e **pare em qualquer falha** seguindo a regra de rollback.

## Pré-condições
- Ler o `CLAUDE.md` da raiz do repositório antes de começar.
- MCPs necessários: Notion, GitHub. Se não estiverem disponíveis, abortar e avisar.

## Passo 1 — Ler o backlog
- Buscar no board do Notion apenas tasks com `Status = Backlog`.
- **REGRA DE IDEMPOTÊNCIA (dura):** filtrar estritamente por `Status = Backlog`. Nunca pegar task que já esteja em "Em andamento", "Em revisão" ou "Concluído". Isso evita pegar a mesma task duas vezes.
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

## Regra de rollback em caso de erro (dura)
Se qualquer passo após o Passo 3 falhar (build quebra, teste não passa, erro de API, etc.):
1. **NÃO** deixar a task travada em "Em andamento".
2. Mover a task de volta para `Status = Backlog`.
3. Reportar claramente o que falhou e em qual passo.
4. Não deixar branch órfã sem aviso: se a branch foi criada, mencionar o nome para limpeza manual.

## Limites (nunca violar)
- Nunca mover para "Concluído".
- Nunca dar merge, nunca deploy, nunca commitar direto em `main`.
- O fluxo do agente termina em "Em revisão". O resto é humano.
