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

## Privacidade / LGPD

Por design, a ferramenta **não coleta nem transmite dados pessoais**:

- **100% local**: a gravação e todo o processamento (trim, crop, moldura, GIF/MP4)
  acontecem no navegador via Canvas/WebCodecs. Nenhum frame é enviado a servidor.
- **Sem rastreamento**: zero cookies, `localStorage`, analytics ou logs de usuário.
- **Permissões mínimas**: pede só captura de tela (`getDisplayMedia`), no clique do
  usuário, com o consentimento nativo do browser. Não pede microfone nem câmera
  (`audio: false`).
- **Sem terceiros**: a fonte DM Sans é self-hospedada em `/public/fonts` — nada é
  carregado de CDNs externas (evita transferir o IP do usuário ao Google Fonts).
- **Saída sob controle do usuário**: o arquivo final só sai via "Baixar", iniciado
  pelo próprio usuário.
