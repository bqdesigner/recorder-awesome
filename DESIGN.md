---
name: Recorder Awesome
description: Grava tela no browser, enquadra em mockup de device e exporta GIF ou MP4.
colors:
  accent: "#4a9eff"
  accent-strong: "#1f6fe0"
  accent-soft: "#4a9eff1f"
  ink: "#08060d"
  body: "#6b6375"
  bg: "#ffffff"
  surface: "#f4f3ec"
  border: "#e5e4e7"
  canvas: "#000000"
  dark-bg: "#16171d"
  dark-surface: "#1f2028"
  dark-border: "#2e303a"
  dark-ink: "#f3f4f6"
  dark-body: "#9ca3af"
typography:
  display:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "56px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.18
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.18px"
  label:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13.6px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  mono:
    fontFamily: "ui-monospace, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  xs: "2px"
  sm: "6px"
  md: "8px"
  pill: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "10px 19px"
  button-default:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 19px"
  color-input:
    rounded: "{rounded.sm}"
    width: "48px"
    height: "32px"
---

# Design System: Recorder Awesome

## 1. Overview

**Creative North Star: "The Clean Studio"**

Um estúdio claro e arejado onde a gravação é a peça em exposição. A interface é a parede branca da galeria: recua, dá espaço, e deixa o preview enquadrado ser a única coisa que pede atenção. Light-first por padrão. Os controles são instrumentos discretos na bancada, não competem com o que está na tela. O usuário entra com uma captura crua, enquadra num device frame e sai com um clipe pronto: a ferramenta não deve ser lembrada, só o resultado.

A densidade é baixa e o ritmo é calmo. Um único accent azul carrega ação, seleção e estado; o resto é neutro. Nada de decoração: confiança vem da previsibilidade (WYSIWYG, mesmo vocabulário de controle nas 4 etapas Grava→Edita→Formata→Output), não de enfeite. O preview tem fundo preto/xadrez porque é a mesa de trabalho do conteúdo, não da marca; o chrome ao redor permanece claro e quieto.

Este sistema **rejeita explicitamente**: o template cru sem identidade do gifcap, o SaaS cinza genérico (hero-metric, grids de cards iguais, gradiente roxo decorativo, eyebrow em toda seção), o peso corporativo enterprise (navy+dourado, toolbars infinitas) e qualquer toque infantil (cores berrantes, bordas super arredondadas, emoji). É ferramenta de criador adulto.

**Key Characteristics:**
- Light-first; o preview escuro é a exceção proposital, não o tema.
- Um único accent azul, usado só para ação/seleção/estado.
- Chrome neutro e silencioso; o canvas é o herói.
- Vocabulário de controle idêntico nas 4 etapas.
- Familiaridade > surpresa: affordances padrão, sem reinventar.

## 2. Colors

Paleta neutra de estúdio com um único azul de ação; o preto do canvas é superfície de trabalho, não cor de marca.

### Primary
O Studio Blue tem **duas calibragens da mesma família** por exigência de contraste (WCAG AA). Um único accent, dois tons:
- **Studio Blue** (`#4a9eff`, bright): para accents que ficam **sobre o canvas escuro** — handles do crop, indicadores sobre o preview. Sobre preto rende 7.6:1. Como texto/botão sobre superfície clara falha (2.75:1), nunca usar assim.
- **Studio Blue Strong** (`#1f6fe0`, strong): para **qualquer coisa que carrega ou é texto** sobre superfície clara — botão sólido (texto branco 4.76:1 ✓), etapa atual do stepper, fill da timeline, borda do thumb. Passa AA como texto sobre claro (4.76:1) e sobre escuro (4.54:1).
- **Studio Blue Soft** (`#4a9eff1f`, ~12% alpha): fundo sutil de estado selecionado/hover. Nunca como preenchimento decorativo.

Os dois somados ficam em ≤10% de qualquer tela. É azul técnico-neutro deliberado, não "azul de link default".

### Neutral
- **Ink** (`#08060d` light / `#f3f4f6` dark): títulos e texto de alto contraste.
- **Body** (`#6b6375` light / `#9ca3af` dark): corpo de texto, hints, labels.
- **Background** (`#ffffff` light / `#16171d` dark): superfície base do app shell.
- **Surface** (`#f4f3ec` light / `#1f2028` dark): blocos de código e superfícies levemente elevadas.
- **Border** (`#e5e4e7` light / `#2e303a` dark): divisórias, contorno de controles, borda do color picker.

### Canvas
- **Canvas Black** (`#000000`): fundo do `<canvas>` de preview e do stage. É a mesa do conteúdo, não cor de identidade. Pixels transparentes revelam um xadrez cinza (`#555`/`#777`) que indica transparência — utilitário, nunca decorativo.

### Named Rules
**The One Blue Rule.** Existe exatamente um accent: o Studio Blue (duas calibragens, `#4a9eff` bright sobre canvas escuro / `#1f6fe0` strong para texto e sólidos sobre claro). Toda ação, seleção e estado usa ele ou nada. Nenhuma segunda cor de marca entra. Proibido reintroduzir o roxo `#aa3bff` (sobra de template Vite, sem uso real no app).

**The AA Blue Rule.** Texto azul ou botão azul com texto branco sobre superfície clara usa **sempre** o strong (`#1f6fe0`). O bright (`#4a9eff`) só sobrevive sobre o canvas escuro. Nunca texto/botão branco sobre o bright em fundo claro: falha AA (2.75:1).

**The Quiet Chrome Rule.** O chrome (controles, labels, bordas) fica em neutros. Cor só aparece para sinalizar ação ou estado. Se uma cor não está dizendo "clique aqui" ou "isto está ativo", ela é neutra.

## 3. Typography

**Body & Display Font:** system-ui (com fallback `'Segoe UI', Roboto, sans-serif`)
**Mono Font:** ui-monospace (com fallback `Consolas, monospace`)

**Character:** uma única família system-sans carrega tudo (título, corpo, label, botão); o mono entra só para valores técnicos/código. Sem fonte display: é produto, não marca. Hierarquia vem de escala + peso (400 corpo, 500 títulos), não de troca de família. Fontes do sistema = zero latência de carga e familiaridade nativa por OS.

### Hierarchy
- **Display** (500, 56px, lh 1.1, ls -0.03em): título único da landing/topo. Teto de 36px no mobile (≤1024px).
- **Title** (500, 24px, lh 1.18, ls -0.01em): cabeçalhos de seção/etapa.
- **Body** (400, 18px, lh 1.45, ls 0.18px): texto corrido. 16px abaixo de 1024px. Prosa até 65–75ch.
- **Label** (400, ~13.6px / 0.85rem, lh 1.3): stepper, hints, labels de controle de formato.
- **Mono** (400, 15px): valores técnicos e código inline, sobre Surface.

### Named Rules
**The One Family Rule.** Uma única sans do sistema para toda a UI. Contraste se faz com peso (400/500) e escala, nunca com uma segunda família display. Mono só para o que é literalmente técnico.

## 4. Elevation

Sistema majoritariamente plano. Profundidade vem de bordas de 1px (`#e5e4e7`) e camadas tonais (Surface sobre Background), não de sombras flutuantes. O shell é flat-by-default.

### Shadow Vocabulary
- **Content Lift** (`box-shadow: rgba(0,0,0,0.1) 0 10px 15px -3px, rgba(0,0,0,0.05) 0 4px 6px -2px`): elevação reservada para overlays/popovers eventuais. Não usar em cards de conteúdo estáticos.
- **Crop Scrim** (`box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)`): técnica de escurecer tudo fora do retângulo de recorte. Funcional, exclusiva do modo crop.
- **Overlay Text Shadow** (`text-shadow: 0 2px 8px rgba(0,0,0,0.6)`): legibilidade do indicador de pausa (▶/⏸) sobre o preview.

### Named Rules
**The Flat-By-Default Rule.** Superfícies são planas em repouso. Sombra só aparece como resposta a contexto (overlay sobre o canvas, scrim do crop), nunca como decoração ambiente de card.

## 5. Components

### Buttons
- **Shape:** cantos suaves de 8px (`{rounded.md}`).
- **Primary:** Studio Blue sólido (`#4a9eff`), texto branco, padding `0.6rem 1.2rem` (10px 19px). Reservado para a ação principal da etapa (ex.: Exportar).
- **Default:** mesma forma e padding, sem fundo de marca; herda neutro. Para ações secundárias.
- **Disabled:** `opacity: 0.6`, cursor default. Sem mudar cor.
- **Hover/Focus:** foco visível obrigatório (anel/contorno); estado de hover discreto. Transições 150–250ms.

### Stepper (navegação de etapas)
- **Style:** lista horizontal de labels (0.85rem), centralizada, sem números decorativos forçados.
- **Default:** Body neutro (`#6b6375`/cinza).
- **Active (`.on`):** Studio Blue + peso 600. Cor sinaliza "você está aqui".

### Inputs / Fields
- **Color picker:** swatch 48×32px, borda 1px, raio 6px (`{rounded.sm}`), cursor pointer. Para o background atrás da moldura.
- **Format labels:** coluna com label 0.85rem acima do controle; checkbox em linha.
- **Focus:** anel de foco visível em todos os controles (WCAG AA).

### Timeline / Dual Range (componente assinatura)
- **Trilho:** 4px de altura, raio 2px, neutro (`#444` no contexto escuro do editor).
- **Fill:** Studio Blue entre os dois thumbs (região selecionada do trim).
- **Thumbs:** círculo de 16px (`{rounded.pill}`), branco com borda 2px Studio Blue.
- **Playhead:** linha vertical branca de 2px marcando a posição da animação.
- **Comportamento:** dois ranges sobrepostos; só os thumbs capturam o ponteiro. É o controle central de edição (trim).

### Stage / Preview (componente assinatura)
- **Stage:** `inline-block`, raio 8px, `overflow: hidden`. Herói da tela.
- **Preview canvas:** fundo Canvas Black (`#000`); `max-height: 60vh`.
- **Checker:** quando há transparência, xadrez cinza 16px revela os pixels transparentes.
- **Crop layer:** borda tracejada branca 2px + scrim escuro ao redor; handles brancos 12px nos cantos com borda Studio Blue.
- **Play overlay:** ícone de pausa central, branco translúcido, com text-shadow.

## 6. Do's and Don'ts

### Do:
- **Do** usar exatamente um accent: Studio Blue, para ação/seleção/estado, em ≤10% da tela. Strong `#1f6fe0` para texto/sólidos sobre claro; bright `#4a9eff` só sobre o canvas escuro.
- **Do** manter o chrome neutro e light-first; o preview escuro é a única superfície escura proposital.
- **Do** carregar toda a UI numa única system-sans; contraste por peso (400/500) e escala.
- **Do** repetir o mesmo vocabulário de botão, controle e ícone nas 4 etapas (Grava→Edita→Formata→Output).
- **Do** garantir WCAG AA: corpo ≥4.5:1, foco visível em todo controle, operável por teclado, `prefers-reduced-motion` respeitado na timeline/preview.
- **Do** manter superfícies planas; sombra só como resposta a contexto (overlay, scrim do crop).

### Don't:
- **Don't** reintroduzir o roxo `#aa3bff` nem qualquer segunda cor de marca — é sobra de template Vite, sem uso real. (Mata a anti-ref "gradiente roxo SaaS".)
- **Don't** parecer SaaS cinza genérico: nada de hero-metric, grids de cards iguais, eyebrow tracked em toda seção.
- **Don't** parecer enterprise pesado (navy+dourado, toolbars infinitas) nem template cru estilo gifcap sem identidade.
- **Don't** cair no infantil: nada de cores berrantes, bordas super arredondadas além do raio pill dos thumbs, ou emoji decorativo.
- **Don't** hardcodar cinzas avulsos (`#444`/`#666`/`#888`/`#aaa`/`#ccc`) como os atuais do Editor; usar os tokens neutros (Ink/Body/Border/Surface) que respondem a light/dark.
- **Don't** introduzir fonte display ou segunda família; uma sans do sistema basta.
- **Don't** usar sombra ambiente decorativa em cards estáticos.
