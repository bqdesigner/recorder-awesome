# engine

Núcleo de gravação/render — **TypeScript puro, sem React**. Não importa nada de UI.

Mapeia o fluxo do produto em módulos isolados (preenchidos por fase):

| Módulo | Etapa | Fase |
|--------|-------|------|
| `capture` | Grava tela (`getDisplayMedia` → webm) | 1 |
| `decode` | webm → frames (`VideoDecoder`) | 1 |
| `compose` | Desenha frame no canvas: background → moldura → vídeo | 3 |
| `encode` | Frames → GIF (`gifenc`) / MP4 (`mp4-muxer`) | 1 / 4 |

A UI (React) só orquestra o engine via essas funções — nunca o contrário.
Assim o engine fica portável e testável fora do browser onde possível.
