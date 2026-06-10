# Template de Task — História (Notion)

> Cole isto como template de página na database do board, pra tasks de **feature** (algo novo).
> Para correção de bug, use o `template-task-prd.md` (sintoma/reprodução).
> Quanto mais preciso, menos o agente alucina. Campo vazio = agente vai perguntar (ou errar).

---

## 📖 História
*Uma frase no formato: como [quem], quero [o quê] para [por quê]. O "por quê" é o que protege contra a feature errada.*

> Ex: Como usuário gravando uma demo, quero colocar a gravação dentro de uma moldura de iPhone para que o vídeo final pareça uma demonstração de produto.

---

## 🧩 Contexto / motivação
*Por que isto agora. De onde veio (plano, feedback, fase). Liga a história ao resto do produto.*

> Ex: Fase 3 do `plan.md` (Formata). É um dos dois diferenciais do projeto vs gifcap (moldura + MP4). Sem isto, fases 1–2 não superam o gifcap.

---

## ✅ Comportamento esperado
*Uma frase. O critério de "pronto" em alto nível, do ponto de vista de quem usa.*

> Ex: O usuário escolhe uma moldura na etapa Formata e vê a gravação renderizada dentro dela, ao vivo no preview e idêntica no arquivo exportado.

---

## 📋 Critérios de aceite
*Lista verificável. O agente usa isto para escrever os testes. Cada item = um teste ou um passo de checklist.*

- [ ]
- [ ]
- [ ]

> Ex:
> - [ ] Seletor de moldura mostra ao menos: borda simples, 1 phone, 1 laptop
> - [ ] `composedSize()` retorna dimensões corretas (vídeo + moldura + padding) para cada moldura
> - [ ] Trocar de moldura atualiza o preview sem recarregar a gravação
> - [ ] O que aparece no preview é igual ao frame exportado (mesma geometria)

---

## 🎨 Design / referência
*Como deve parecer/comportar. Link de Figma, sketch, ou descrição. Estados vazios e de erro contam.*

> Ex: Seletor horizontal de thumbnails na etapa Formata. Estado default = sem moldura (vídeo cru). Sem moldura selecionada ≠ erro.

---

## 📁 Escopo / arquivos prováveis
*Onde a feature provavelmente encosta. Reduz branch gigante e alucinação.*

> Ex: `src/engine/frames.ts`, `src/engine/compose.ts`, `src/components/Editor.tsx`

---

## 🚫 Fora de escopo
*O que o agente NÃO deve tocar/construir nesta task, mesmo que pareça relacionado.*

> Ex: Não implementar pack de molduras SVG real (placeholders bastam). Não mexer no encoder de MP4. Não adicionar background customizável (é outra task).

---

## 🧪 Definição de teste
*Sem isto o agente não sabe como validar — principalmente em render/export visual.*

**Automatizável (agente escreve e roda — `npm test`):**
> Ex: teste de `composedSize()` e dos layouts em `frames.ts` (dimensões, clamp de tamanho). Estados do seletor de moldura.

**Manual (vira checklist no PR, só o humano valida):**
> Ex: abrir o preview e confirmar visualmente que o vídeo encaixa na tela da moldura sem distorção; exportar e conferir que o arquivo bate com o preview.

---

## 🔗 Metadados (preenchidos pelo agente)
- **Branch:** *(o agente preenche — `feat/<slug-curto>`)*
- **PR link:** *(o agente preenche)*
- **Repo:** `recorder-awesome`
