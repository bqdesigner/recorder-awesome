---
name: Recorder Awesome
description: Grava tela no browser, enquadra em mockup de device e exporta GIF ou MP4.
colors:
  bg: "#0d0d0f"
  surface: "#151517"
  surface-2: "#1c1c20"
  surface-3: "#25252b"
  line: "#26262c"
  line-strong: "#363640"
  text: "#f4f4f6"
  text-2: "#b9b9c2"
  muted: "#7c7c88"
  accent: "#4a9eff"
  accent-2: "#9b5de5"
  rec: "#ff3b30"
  danger: "#ff5c5c"
  canvas: "#000000"
  primary-fill: "#ffffff"
typography:
  display:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "clamp(40px, 7vw, 72px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.05em"
  lead:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  hint:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  overline:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.6px"
rounded:
  sm: "7px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "28px"
motion:
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)"
  fast: "150ms"
  medium: "180ms"
components:
  button-primary:
    backgroundColor: "{colors.primary-fill}"
    textColor: "#111111"
    rounded: "{rounded.sm}"
    height: "38px"
  button-default:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "38px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.sm}"
    height: "38px"
  segmented:
    backgroundColor: "{colors.surface}"
    activeColor: "{colors.surface-3}"
    rounded: "{rounded.md}"
    height: "34px"
  switch:
    offColor: "{colors.surface-3}"
    onColor: "{colors.accent}"
    width: "42px"
    height: "24px"
  range:
    trackColor: "{colors.surface-3}"
    thumbBorder: "{colors.accent}"
    trackHeight: "6px"
    thumbSize: "16px"
---

# Design System: Recorder Awesome

## 1. Overview

**Creative North Star: "The Dark Studio"**

Um estúdio escuro, como a ilha de edição de um editor de vídeo. A gravação é a peça iluminada no centro; tudo em volta é chrome grafite que recua. O usuário entra com uma captura crua, enquadra numa moldura e sai com um clipe pronto: a ferramenta não deve ser lembrada, só o resultado.

A tela se divide em dois momentos com tons diferentes:
- **Tela inicial:** o único lugar com expressão de marca. Título com gradiente animado, brilho azul/roxo de fundo, botão de gravar em pílula branca.
- **Editor:** instrumento de trabalho. Palco à esquerda, inspector fixo à direita, controles neutros. Cor só aparece para seleção e estado.

Nada de decoração no editor: confiança vem da previsibilidade (preview WYSIWYG, mesmo vocabulário de controle em todo o inspector).

Este sistema **rejeita**: o template cru sem identidade do gifcap, o SaaS cinza genérico (hero-metric, grids de cards iguais, eyebrow em toda seção), o peso corporativo (navy+dourado, toolbars infinitas) e o infantil (cores berrantes, emoji espalhado pela UI).

**Key Characteristics:**
- Dark-only (`color-scheme: dark`); não há tema claro.
- Um accent azul para ação, seleção e estado.
- Um segundo tom (roxo) restrito a momentos de marca, nunca a estado.
- Profundidade por camadas tonais de superfície, não por sombra.
- O preview é o herói; o inspector é bancada.

## 2. Colors

Paleta grafite em camadas, um azul de estado e um roxo de marca. Todos os valores vivem como custom properties em `src/index.css`.

### Superfícies (do fundo para cima)
- **Background** (`--bg`, `#0d0d0f`): base do app shell.
- **Surface** (`--surface`, `#151517`): inspector, trilho do transporte, palco, fundo do segmented.
- **Surface 2** (`--surface-2`, `#1c1c20`): cartões da grade de molduras, popover do color picker, hover leve.
- **Surface 3** (`--surface-3`, `#25252b`): botão default, item ativo do segmented, trilho de ranges, switch desligado.

### Linhas
- **Line** (`--line`, `#26262c`): divisórias e contorno padrão de controles.
- **Line Strong** (`--line-strong`, `#363640`): hover de contorno, pontilhado do palco, borda do popover.

### Texto
- **Text** (`--text`, `#f4f4f6`): títulos, rótulos, valor ativo.
- **Text 2** (`--text-2`, `#b9b9c2`): texto secundário, itens inativos, subtítulo.
- **Muted** (`--muted`, `#7c7c88`): hints, títulos de grupo, informação de apoio.

### Accent
- **Studio Blue** (`--accent`, `#4a9eff`): seleção (borda da moldura ativa, color picker aberto), switch ligado, thumb dos sliders, handles do crop, anel de foco. Sobre as superfícies escuras rende contraste AA com folga.
- **Blue Soft** (`rgba(74, 158, 255, 0.1)`): fundo do cartão de moldura selecionado. Com 0.35 de alpha, vira a barra de progresso do download.

### Marca
- **Studio Violet** (`--accent-2`, `#9b5de5`): só em momentos de marca. Aparece no gradiente do título, no brilho de fundo da tela inicial e no fill do trim (degradê azul → roxo).

### Semânticas
- **Rec** (`--rec`, `#ff3b30`): ponto do botão de gravar e rótulo "Gravando". Exclusivo do estado de gravação.
- **Danger** (`--danger`, `#ff5c5c`): mensagem de erro de exportação, sobre fundo `rgba(255, 92, 92, 0.12)`. Único vermelho no inspector.

### Canvas
- **Canvas Black** (`#000`): fundo do palco do preview. É mesa de trabalho do conteúdo, não cor de marca.
- **Checker** (`#fff` / `#cfcfcf`, 16px): revela pixels transparentes no preview. No swatch do color picker usa `#fff` / `#bbb` em 8px.

### Named Rules
**The One Blue Rule.** Toda seleção, estado ativo e foco usa o Studio Blue ou nada. Se uma cor não diz "isto está ativo" ou "isto tem foco", ela é neutra.

**The Violet Is Brand Rule.** O roxo nunca sinaliza estado nem ação. Ele só aparece junto com o azul, em gradiente, na tela inicial e no fill do trim.

**The Primary Is White Rule.** O botão de ação principal (Gravar, Baixar) é branco com texto quase preto, não azul. Em tela escura, o branco é o elemento de maior contraste, e o azul fica livre para estado.

**The Tokens Only Rule.** Cinzas de UI vêm dos tokens. Hex avulso só é aceito em conteúdo (canvas, checker) e no par branco/`#111` do botão primário.

## 3. Typography

**Fonte:** DM Sans variável (400–700), self-hospedada em `/public/fonts` (latin + latin-ext), com `font-display: swap` e fallback `system-ui`. Não há mono: valores numéricos usam `font-variant-numeric: tabular-nums`.

### Hierarchy
- **Display** (700, `clamp(40px, 7vw, 72px)`, lh 1.05, ls -0.05em): título da tela inicial, com gradiente animado. Único uso.
- **Lead** (400, 18px, lh 1.5, `--text-2`, até 44ch): subtítulo da tela inicial.
- **Timer** (600, 28px, tabular): cronômetro durante a gravação.
- **Brand** (600, 15px, ls -0.2px): nome na topbar.
- **Label** (500, 14px): rótulo de campo, botões (14px) e botão bloco (15px).
- **Control** (500, 13px): itens do segmented, valor do color picker, estimativa.
- **Hint** (400, 12px, `--muted`): dica abaixo do rótulo, rodapé, texto do transporte.
- **Overline** (600, 12px, ls 0.6px, maiúsculas, `--muted`): título de grupo do inspector ("Formatar", "Exportar"). Rótulo "Gravando" usa 11px em `--rec`.

### Named Rules
**The One Family Rule.** DM Sans para tudo. Hierarquia por peso (400/500/600/700) e escala, nunca por segunda família.

**The Tabular Numbers Rule.** Todo número que muda ao vivo (relógio, cronômetro, estimativa, progresso, hex) usa `tabular-nums` para não tremer.

## 4. Elevation

Sistema plano. Profundidade vem das quatro camadas de superfície e de bordas de 1px, não de sombras ambiente.

### Shadow Vocabulary
- **Stage Lift** (`0 20px 60px rgba(0,0,0,0.5)`): destaca o preview sobre o palco pontilhado. É a única sombra permanente.
- **Pop** (`--shadow-pop`, `0 16px 40px rgba(0,0,0,0.55)`): popover do color picker.
- **Segmented Active** (`0 1px 2px rgba(0,0,0,0.4)`): leve relevo no item selecionado.
- **Rec Glow** (`0 10px 30px rgba(255,255,255,0.12)`): brilho do botão de gravar na tela inicial.
- **Crop Scrim** (`0 0 0 9999px rgba(0,0,0,0.55)`): escurece tudo fora do recorte. Exclusivo do modo crop.
- **Overlay Blur** (`rgba(0,0,0,0.55–0.6)` + `backdrop-filter: blur(3–4px)`): badge de play e overlay de exportação sobre o preview.

### Named Rules
**The Flat-By-Default Rule.** Superfícies são planas em repouso. Sombra só aparece para o preview, para overlays e para o botão de gravar.

## 5. Components

### Shell
- **Topbar:** 56px de altura, padding 0 20px, borda inferior `--line`. Marca à esquerda; ações da tela e "Enviar feedback" (ghost) à direita.
- **Footer** (só tela inicial): 12px `--muted`, links `--text-2` sublinhados por borda `--line-strong`.

### Tela inicial
- **Fundo:** dois `radial-gradient` suaves (azul 12% no topo, roxo 10% no canto inferior direito).
- **Título:** gradiente linear `branco → #ff6b6b → azul → roxo → branco` recortado no texto, com o ângulo girando em 8s via `@property --grad-angle`.
- **Botão de gravar (`.rec-btn`):** pílula branca de 56px, texto `#111` 17px/600, ponto vermelho de 14px. Gravando: fundo `--surface-3`, ponto vira quadrado com pulso `live-pulse` de 1.2s.
- **Passos (`.steps`):** 3 colunas (1 abaixo de 720px), cartão `rgba(255,255,255,0.03)` com borda `--line` e raio 16px; número em círculo de 28px sobre `--surface-3`.

### Buttons (`.btn`)
- **Shape:** 38px de altura, padding 0 14px, raio 7px, 14px/500. Transições de 150ms com `--ease`.
- **Default:** `--surface-3`; hover `--line-strong`.
- **Primary:** branco com texto `#111`; hover `#e9e9ee`. Reservado para a ação principal da tela.
- **Ghost:** transparente, texto `--text-2`; hover `--surface-2`. Abaixo de 720px vira só ícone.
- **Icon:** quadrado de 38px. **Block:** largura total, 46px, 15px (botão de baixar).
- **Pressed:** `translateY(1px)`. **Disabled:** opacity 0.4, `not-allowed`.
- **Marcado (`.is-marked`):** borda azul, para ferramenta ligada (crop).

### Editor: layout
- **Palco (`.stage-wrap`):** `--surface` com grade pontilhada `--line-strong` a cada 22px, raio 16px, borda `--line`.
- **Preview (`.stage`):** fundo preto, raio 7px, Stage Lift. Canvas desenhado no tamanho nativo e escalado por CSS.
- **Transporte:** linha em `--surface` com borda e raio 10px: play, relógio tabular (`atual / total` com separador e total em `--muted`), timeline e ferramentas de crop. Hint de 12px abaixo.
- **Inspector:** coluna fixa de 360px à direita, `--surface`, borda esquerda `--line`. Área rolável com grupos; rodapé fixo com estimativa, erro e botão de baixar.
- **Abaixo de 960px:** inspector vai para baixo do palco, sem rolagem própria; relógio esconde o total.

### Inspector: grupos e campos
- **Group:** coluna com gap 16px; grupos consecutivos separados por borda `--line` e 24px de respiro. Título em Overline.
- **Field:** rótulo (14px/500) com hint opcional (12px `--muted`) acima do controle. Variante **inline** põe rótulo e controle na mesma linha (switch, color picker). **Disabled:** rótulo com opacity 0.45 e hint explicando o porquê ("Ative o respiro para usar", "Indisponível para esta moldura").

### Grade de molduras (`.frame-grid`)
- 3 colunas, gap 8px. Cartão `--surface-2`, borda `--line`, raio 10px, ícone + rótulo 12px/500.
- **Hover:** borda `--line-strong`. **Ativo:** borda azul + Blue Soft. Semântica `radiogroup`/`radio`.

### Segmented (`.seg`)
- Trilho `--surface` com borda `--line`, raio 10px, padding 4px. Itens de 34px, 13px/500, `--text-2`.
- **Ativo:** `--surface-3`, texto `--text`, relevo leve. **Hover:** `--surface-2`.
- **Variante `lg`:** cartões de 58px com título 15px/600 e legenda 12px (seletor GIF/MP4).
- Uso: poucas opções mutuamente exclusivas (encaixe, velocidade, fps, resolução).

### Switch (`.switch`)
- 42×24px, pílula. Desligado `--surface-3`, ligado Studio Blue; knob branco de 18px desliza 18px em 180ms. `role="switch"`.

### Range (`.range`)
- Slider simples de valor único (Radius). Trilho de 6px em `--surface-3`, thumb de 16px branco com borda 2px azul. Valor atual mostrado no hint do campo (`24px`). Disabled: opacity 0.45.

### Timeline / Dual Range (componente assinatura)
- **Trilho:** 10px, pílula, `--surface-3`.
- **Fill:** degradê azul → roxo entre as alças (região mantida no trim).
- **Alças:** barras verticais brancas de 12×22px, raio 5px, borda 2px `--bg`, cursor `ew-resize`. Barra em vez de círculo porque é mais fácil de pegar.
- **Playhead:** linha branca de 2px com ponto `--rec` de 8px no topo; acompanha o playback.
- **Comportamento:** dois ranges sobrepostos; só as alças capturam o ponteiro.

### Color picker (`.cp`)
- **Gatilho:** 36px, `--surface-3`, swatch circular de 20px + hex tabular em `--text-2`. Aberto: borda azul.
- **Popover:** 220px, `--surface-2`, borda `--line-strong`, raio 10px, sombra Pop, entrada de 160ms. Opção "Transparente" com swatch xadrez, campo hex e seletor nativo.

### Crop
- Retângulo com borda branca de 1.5px e Crop Scrim; handles circulares de 14px brancos com borda azul nos cantos.

### Feedback de exportação
- **Overlay no preview:** spinner branco de 28px + texto tabular.
- **Botão de baixar:** barra de progresso em Blue Soft (0.35) preenchendo por trás do rótulo.
- **Estimativa:** `dimensões · quadros · peso` em 13px `--text-2`, com selo "estimativa" em overline 11px.

## 6. Do's and Don'ts

### Do:
- **Do** usar os tokens de `src/index.css` para toda cor, raio e easing da UI.
- **Do** subir de camada de superfície (`--bg` → `--surface` → `--surface-2` → `--surface-3`) para dar profundidade, em vez de sombra.
- **Do** usar Studio Blue para seleção, estado ligado e foco; branco para a ação principal.
- **Do** explicar no hint por que um controle está desabilitado.
- **Do** garantir WCAG AA: foco visível em todo controle (anel azul de 2px, offset 2px), operável por teclado, semântica de `radiogroup`/`switch` nos controles customizados.
- **Do** respeitar `prefers-reduced-motion`: gradiente do título e pulso de gravação param; transições de botão, segmented, switch, moldura e progresso são desligadas.

### Don't:
- **Don't** usar o roxo para estado, ação ou foco. Ele é de marca e só aparece em gradiente com o azul.
- **Don't** levar a expressão da tela inicial (gradiente, brilho, animação) para o editor.
- **Don't** usar vermelho fora de gravação (`--rec`) e erro (`--danger`).
- **Don't** hardcodar cinzas avulsos; se falta um tom, criar token.
- **Don't** introduzir segunda família tipográfica ou fonte carregada de CDN externa.
- **Don't** usar sombra ambiente em cartões estáticos.
- **Don't** parecer SaaS cinza genérico, enterprise pesado ou template cru sem identidade.
