/** Exporta um webm gravado como GIF, amostrando frames via <video> + canvas. */

import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { compose, type Scene } from './compose'
import { loadVideo, seekTo } from './video'

/** Recorte da fonte, em frações 0..1 do frame original. */
export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export interface GifOptions {
  /** Quadros por segundo do GIF. Default 12. */
  fps?: number
  /** Início do trecho em segundos. Default 0. */
  start?: number
  /** Fim do trecho em segundos. Default = duração. */
  end?: number
  /** Recorte da região. Default = frame inteiro. */
  crop?: Crop
  /** Cena (moldura, background, fit). Default = vídeo cru. */
  scene?: Scene
  /** Multiplicador de velocidade (2 = 2x mais rápido). Default 1. */
  speed?: number
  /** Progresso 0..1. */
  onProgress?: (p: number) => void
}

const DEFAULT_SCENE: Scene = {
  frame: null,
  background: '#000',
  fit: 'fit',
  padding: 0,
}

export async function webmToGif(
  blob: Blob,
  duration: number,
  opts: GifOptions = {},
): Promise<Blob> {
  const fps = opts.fps ?? 12

  const { video, duration: realDuration } = await loadVideo(blob, duration)

  const vw = video.videoWidth
  const vh = video.videoHeight

  // região de origem (crop em px), default frame inteiro
  const crop = opts.crop
  const src = {
    x: crop ? crop.x * vw : 0,
    y: crop ? crop.y * vh : 0,
    w: crop ? crop.w * vw : vw,
    h: crop ? crop.h * vh : vh,
  }
  const scene = opts.scene ?? DEFAULT_SCENE

  const canvas = document.createElement('canvas')

  // trecho a exportar (trim) + velocidade
  const speed = opts.speed ?? 1
  const start = Math.max(0, opts.start ?? 0)
  const end = Math.min(realDuration, opts.end ?? realDuration)
  const span = Math.max(0, end - start)

  const gif = GIFEncoder()
  const delay = Math.round(1000 / fps)
  const frameCount = Math.max(1, Math.round((span / speed) * fps))
  const transparent = scene.background === 'transparent'

  for (let i = 0; i < frameCount; i++) {
    await seekTo(video, Math.min(start + (i / fps) * speed, end))
    const { width, height } = compose(canvas, video, src, scene)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const { data } = ctx.getImageData(0, 0, width, height)
    if (transparent) {
      const palette = quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true })
      const index = applyPalette(data, palette, 'rgba4444')
      gif.writeFrame(index, width, height, { palette, delay, transparent: true })
    } else {
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, width, height, { palette, delay })
    }
    opts.onProgress?.((i + 1) / frameCount)
  }

  gif.finish()
  URL.revokeObjectURL(video.src)
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
}
