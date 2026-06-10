# Template de Task — PRD Técnico (Notion)

> Cole isto como template de página na database do board. Preencha tudo antes de mover para "Backlog".
> Quanto mais preciso, menos o agente alucina. Campo vazio = agente vai perguntar (ou errar).

---

## 🎯 Contexto / Sintoma
*O que você viu acontecendo. Concreto, observável, reproduzível.*

> Ex: Ao exportar GIF de gravações com mais de 10s, o último frame é cortado — o GIF termina ~300ms antes do fim real da gravação.

**Passos para reproduzir:**
1.
2.
3.

---

## ✅ Comportamento esperado
*Uma frase. O critério de "pronto" em alto nível.*

> Ex: O GIF exportado deve conter todos os frames até o fim exato da gravação, independente da duração.

---

## 📋 Critérios de aceite
*Lista verificável. O agente usa isto para escrever os testes.*

- [ ]
- [ ]
- [ ]

> Ex:
> - [ ] GIF de 5s, 15s e 35s contêm o frame final
> - [ ] Nº de frames do GIF = duração × fps (margem de ±1)
> - [ ] Nenhuma regressão no MP4

---

## 📁 Escopo / arquivos prováveis
*Onde provavelmente está o problema. Reduz branch gigante e alucinação.*

> Ex: `src/export/gifEncoder.ts`, `src/recorder/frameBuffer.ts`

---

## 🚫 Fora de escopo
*O que o agente NÃO deve tocar, mesmo que pareça relacionado.*

> Ex: Não mexer na lógica de captura de áudio. Não refatorar o encoder de MP4.

---

## 🧪 Definição de teste
*Sem isto o agente não sabe como validar — principalmente em export binário.*

**Automatizável (agente escreve e roda):**
> Ex: teste unitário do cálculo de frames; teste do estado da máquina de gravação.

**Manual (vira checklist no PR, só o humano valida):**
> Ex: abrir o GIF exportado e confirmar visualmente o frame final; conferir tamanho do arquivo.

---

## 🔗 Metadados (preenchidos pelo agente)
- **Branch:** *(o agente preenche)*
- **PR link:** *(o agente preenche)*
- **Repo:** *(se houver mais de um projeto)*
