/** Composição de um frame: background → moldura → vídeo na área de tela. */

export type Fit = 'fit' | 'fill'

export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
  radius: number
}

export interface FrameLayout {
  /** dimensões do dispositivo (sem padding). */
  width: number
  height: number
  /** área da tela dentro do dispositivo. */
  screen: ScreenRect
}

export interface Frame {
  id: string
  label: string
  /** Layout calculado a partir da resolução da fonte. */
  layout(srcW: number, srcH: number): FrameLayout
  /** Desenha o corpo do dispositivo (atrás da tela). */
  drawBody(ctx: CanvasRenderingContext2D, layout: FrameLayout): void
}

export interface Scene {
  frame: Frame | null
  background: string
  fit: Fit
  /** margem de background ao redor do dispositivo (px). */
  padding: number
  /** cor da tela atrás do vídeo (aparece no letterbox do fit). Default #000. */
  screenFill?: string
}

/** Região da fonte a usar (crop em px, ou frame inteiro). */
export interface SrcRect {
  x: number
  y: number
  w: number
  h: number
}

function baseLayout(scene: Scene, srcW: number, srcH: number): FrameLayout {
  if (scene.frame) return scene.frame.layout(srcW, srcH)
  return { width: srcW, height: srcH, screen: { x: 0, y: 0, w: srcW, h: srcH, radius: 0 } }
}

/** Tamanho final da composição (com padding). */
export function composedSize(scene: Scene, srcW: number, srcH: number) {
  const l = baseLayout(scene, srcW, srcH)
  return {
    width: Math.round(l.width + 2 * scene.padding),
    height: Math.round(l.height + 2 * scene.padding),
    layout: l,
  }
}

function fitRect(sw: number, sh: number, slot: ScreenRect, fit: Fit) {
  const scale =
    fit === 'fill'
      ? Math.max(slot.w / sw, slot.h / sh)
      : Math.min(slot.w / sw, slot.h / sh)
  const dw = sw * scale
  const dh = sh * scale
  return { dx: slot.x + (slot.w - dw) / 2, dy: slot.y + (slot.h - dh) / 2, dw, dh }
}

/** Compõe um frame no canvas. Retorna as dimensões usadas. */
export function compose(
  canvas: HTMLCanvasElement,
  video: CanvasImageSource,
  src: SrcRect,
  scene: Scene,
) {
  const { width, height, layout } = composedSize(scene, src.w, src.h)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  if (scene.background === 'transparent') {
    ctx.clearRect(0, 0, width, height)
  } else {
    ctx.fillStyle = scene.background
    ctx.fillRect(0, 0, width, height)
  }

  ctx.save()
  ctx.translate(scene.padding, scene.padding)

  if (scene.frame) scene.frame.drawBody(ctx, layout)

  const slot = layout.screen
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(slot.x, slot.y, slot.w, slot.h, slot.radius)
  ctx.clip()
  // fundo da tela (visível no letterbox do fit)
  ctx.fillStyle = scene.screenFill ?? '#000'
  ctx.fillRect(slot.x, slot.y, slot.w, slot.h)
  const { dx, dy, dw, dh } = fitRect(src.w, src.h, slot, scene.fit)
  ctx.drawImage(video, src.x, src.y, src.w, src.h, dx, dy, dw, dh)
  ctx.restore()

  ctx.restore()
  return { width, height }
}
