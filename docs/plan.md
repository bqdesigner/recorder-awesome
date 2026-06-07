# Recorder Awesome — Plano de Desenvolvimento

> Status: **rascunho v0** — para iterar antes de codar.
> Referência base: [gifcap.dev](https://gifcap.dev) (simples, gravação→GIF no browser, sem instalar).

---

## 1. Problema

Hoje uso gifcap.dev pra gravar tela. Bom e simples, mas falta:

1. **Outros formatos** — só exporta GIF, quero MP4 também.
2. **Personalização** — não dá pra colocar a gravação dentro de mockup (celular, notebook) nem pôr background.

Esses dois pontos = o diferencial. Gravar+GIF é paridade; mockup+MP4 é o que justifica o projeto.

---

## 2. Escopo (o que faz)

| # | Feature | Detalhe |
|---|---------|---------|
| 1 | Gravar tela | Tela/janela/aba via API do browser |
| 2 | Editar gravação | Cortar início/fim (trim), cortar região da tela (crop) |
| 3 | Moldura (mockup) | iPhone, Android, MacBook, ou borda simples (preta/branca) |
| 4 | Background | Cor sólida atrás da moldura (color picker) |
| 5 | Exportar | Escolher GIF ou MP4 no fim |

Fora de escopo (por ora): áudio, webcam, anotações/setas, zoom/pan animado, nuvem/share link, edição de múltiplos clipes.

---

## 3. Decisão de arquitetura

> **Suporte alvo: Chrome/Edge apenas** (decidido). Libera WebCodecs → pipeline mais rápido e menos código. Firefox/Safari fora por ora.

### A. Plataforma — **web app puro** (decidido)
Roda no browser igual gifcap, zero instalação. `getDisplayMedia()` captura tela.

### B. Como capturar
- `navigator.mediaDevices.getDisplayMedia()` → `MediaStream` → `MediaRecorder` → `Blob` (webm/VP9).
- Sem áudio no MVP.

### C. Pipeline de render — **Canvas + WebCodecs** (decidido)
Como o alvo é só Chrome/Edge, vamos direto no caminho moderno:
- **Decode:** `VideoDecoder` (WebCodecs) lê os frames do webm gravado.
- **Compose:** cada frame redesenhado no `<canvas>`/`OffscreenCanvas` na ordem `background → moldura → vídeo recortado/escalado`.
- **Encode:** `VideoEncoder` (H.264) pra MP4; encoder de GIF pra GIF (ver D).
- Preview WYSIWYG ao vivo, controle total de posicionamento na moldura, roda em worker pra não travar a UI.
- `ffmpeg.wasm` fica só como **fallback** se algum encode der trabalho — não é o caminho principal.

### D. Exportação
- **GIF** — `gifenc` (rápido, leve). Palette limitada → expor FPS e escala pro trade-off qualidade/tamanho.
- **MP4** — `VideoEncoder (H.264, WebCodecs)` + `mp4-muxer`. Rápido e moderno, casa com o pipeline.

### E. Stack / build — **React + Vite + TS** (recomendado)
- UI pesada (timeline, controles, color picker, canvas). React pelo ecossistema e por escalar melhor depois (libs prontas, shadcn/ui, mais contribuidores, caminho pra produto).
- **Engine de render = módulo TS isolado**, desacoplado do React (refs/workers). Canvas/WebCodecs roda fora do ciclo de render → sem problema de performance. Mantém o engine portável.
- Alternativa enxuta: Svelte (bundle menor) — descartada por priorizar escala.

---

## 4. Molduras (mockups) — como funciona

Cada moldura = imagem/SVG do device + retângulo definido de "tela" (onde o vídeo entra).

```
{ id: "iphone-15", src: "iphone.svg", screen: { x, y, w, h, radius } }
```

Render por frame: `background (cor)` → `moldura` → `vídeo recortado/escalado dentro de screen{}`.

MVP de molduras: 1 phone + 1 laptop + borda simples. Achar assets livres (ou desenhar SVG simples). **Pergunta aberta:** desenhar SVGs próprios (controle total, leve) vs usar pack pronto (rápido, checar licença).

---

## 5. Fluxo do produto (4 etapas lineares)

```
[1 Grava] → [2 Edita] → [3 Formata] → [4 Output]
 tela        trim/crop    moldura+bg     GIF ou MP4
```

São estágios sequenciais do mesmo fluxo, não features concorrentes.

## 5b. Fases de desenvolvimento

Estratégia: montar o **trilho fino ponta-a-ponta primeiro** (Grava→Output cru), depois engrossar cada estação. Assim valido o pipeline cedo e cada fase entrega algo testável.

| Fase | Entrega | Critério de sucesso (verificável) |
|------|---------|-----------------------------------|
| **0 — Scaffold** | React+Vite+TS, engine TS isolado, deploy básico | App abre, build passa |
| **1 — Trilho fino** | Grava tela → preview → exporta GIF (sem edição) | Gravo 5s, baixo GIF que abre certo |
| **2 — Edita** | Trim início/fim + crop de região | Corto 5s→3s e recorto uma área; preview e export refletem |
| **3 — Formata** | Moldura (1 phone, 1 laptop, borda simples) + background color | Vídeo aparece dentro do iPhone com fundo azul no preview e no export |
| **4 — Output MP4** | Exportar MP4 (H.264 + mp4-muxer) | Baixo MP4 que toca em qualquer player |
| **5 — Polish** | Mais molduras, ajuste FPS/qualidade/escala, atalhos, gravação longa | Fluxo redondo, não trava em vídeo longo |

Nota: as fases 1–2 sozinhas ainda não superam o gifcap — validam o pipeline. O valor real (o que o gifcap não faz) entra nas fases 3 e 4.

---

## 6. Riscos / pontos de atenção

- **GIF de gravação longa** = arquivo gigante + encode lento. Limitar duração/FPS/escala. (gifcap também sofre disso.)
- **MP4 no browser** é o ponto mais espinhoso — MediaRecorder não gera MP4 confiável no Chrome; depende de WebCodecs ou ffmpeg.wasm.
- **WebCodecs = Chrome/Edge only.** Firefox/Safari ficam de fora ou caem no ffmpeg.wasm. Decidir se importa.
- **Performance** de redesenhar frame-a-frame em gravação longa — usar workers/OffscreenCanvas.
- **Assets de moldura** — licença + ter o retângulo de tela mapeado certo.

---

## 7. Decisões

**Fechadas:**
- Plataforma: web app puro ✅
- Suporte: Chrome/Edge apenas ✅
- Pipeline: Canvas + WebCodecs ✅
- Stack: React + Vite + TS, engine de render isolado ✅
- Exportação: GIF (`gifenc`) + MP4 (`mp4-muxer`) ✅

**Fechadas (cont.):**
- Molduras: SVG próprio simples agora; pack pronto depois ✅
- Áudio: nunca ✅
- Hospedagem do app: Vercel ✅
- Repositório: GitHub privado (`recorder-awesome`) ✅

Plano fechado — pronto pra Fase 0.
