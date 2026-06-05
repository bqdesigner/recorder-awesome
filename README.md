# screen-recorder

Grava tela no browser, edita (trim/crop), formata dentro de moldura (celular/notebook/borda) com background, e exporta em **GIF** ou **MP4**.

Alternativa ao gifcap.dev com personalização (mockups) e saída em MP4.

## Stack
- React + Vite + TypeScript
- Captura: `getDisplayMedia`
- Pipeline: Canvas + WebCodecs (Chrome/Edge)
- Export: GIF (`gifenc`) · MP4 (`mp4-muxer`)
- Deploy: Vercel

## Fluxo
`Grava → Edita → Formata → Output (GIF | MP4)`

Plano completo: [`docs/plan.md`](docs/plan.md).

> Status: em planejamento. Suporte só Chrome/Edge.
