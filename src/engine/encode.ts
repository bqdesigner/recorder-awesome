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
  /** Fator de escala da saída (0..1). 0.5 = metade da resolução. Default 1. */
  scale?: number
  /** Dithering Floyd–Steinberg: reduz banding em gradientes. Default false. */
  dither?: boolean
  /** Progresso 0..1. */
  onProgress?: (p: number) => void
}

/**
 * Amostra 1 a cada `stride` pixels do buffer RGBA, retornando um buffer menor.
 * A palette é construída sobre esse subconjunto: como `quantize` domina o custo
 * do encode (~96-99% do tempo por frame), quantizar sobre 1/stride dos pixels é
 * ~stride× mais rápido e gera palette praticamente idêntica. O applyPalette segue
 * rodando no frame inteiro, então a saída visual não muda de forma perceptível.
 */
export function subsampleRGBA(rgba: Uint8ClampedArray, stride: number): Uint8ClampedArray {
  if (stride <= 1) return rgba
  const pixels = rgba.length / 4
  const count = Math.ceil(pixels / stride)
  const out = new Uint8ClampedArray(count * 4)
  for (let i = 0, o = 0; i < pixels; i += stride, o++) {
    const s = i * 4
    const d = o * 4
    out[d] = rgba[s]
    out[d + 1] = rgba[s + 1]
    out[d + 2] = rgba[s + 2]
    out[d + 3] = rgba[s + 3]
  }
  return out
}

/** Fração de pixels amostrada para construir a palette (1 a cada N). */
const PALETTE_STRIDE = 4

/** Índice da cor mais próxima na palette (busca linear RGB). */
function nearestIndex(r: number, g: number, b: number, palette: number[][]) {
  let best = 0
  let min = Infinity
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i]
    const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2
    if (d < min) {
      min = d
      best = i
    }
  }
  return best
}

/**
 * Mapeia RGBA → índices de palette com dithering Floyd–Steinberg.
 * Acumula o erro em buffer float (sem clamp) e espalha pros vizinhos.
 */
function applyPaletteDithered(
  rgba: Uint8ClampedArray,
  palette: number[][],
  w: number,
  h: number,
): Uint8Array {
  const buf = new Float32Array(w * h * 3)
  for (let i = 0, j = 0; i < w * h; i++, j += 3) {
    buf[j] = rgba[i * 4]
    buf[j + 1] = rgba[i * 4 + 1]
    buf[j + 2] = rgba[i * 4 + 2]
  }
  const index = new Uint8Array(w * h)
  const cache = new Int16Array(65536).fill(-1) // chave rgb565 → índice
  const add = (x: number, y: number, er: number, eg: number, eb: number, f: number) => {
    if (x < 0 || x >= w || y >= h) return
    const j = (y * w + x) * 3
    buf[j] += er * f
    buf[j + 1] += eg * f
    buf[j + 2] += eb * f
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 3
      let r = buf[j], g = buf[j + 1], b = buf[j + 2]
      r = r < 0 ? 0 : r > 255 ? 255 : r
      g = g < 0 ? 0 : g > 255 ? 255 : g
      b = b < 0 ? 0 : b > 255 ? 255 : b
      const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
      let idx = cache[key]
      if (idx === -1) idx = cache[key] = nearestIndex(r, g, b, palette)
      index[y * w + x] = idx
      const pc = palette[idx]
      const er = r - pc[0], eg = g - pc[1], eb = b - pc[2]
      add(x + 1, y, er, eg, eb, 7 / 16)
      add(x - 1, y + 1, er, eg, eb, 3 / 16)
      add(x, y + 1, er, eg, eb, 5 / 16)
      add(x + 1, y + 1, er, eg, eb, 1 / 16)
    }
  }
  return index
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
  // canvas de saída downscaled (usado só quando scale < 1)
  const scale = Math.min(1, Math.max(0.01, opts.scale ?? 1))
  const out = document.createElement('canvas')
  const outCtx = out.getContext('2d', { willReadFrequently: true })!

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
    const composed = compose(canvas, video, src, scene)

    // saída na resolução final (reduzida se scale < 1)
    let fw = composed.width
    let fh = composed.height
    let data: Uint8ClampedArray
    if (scale < 1) {
      fw = Math.max(1, Math.round(composed.width * scale))
      fh = Math.max(1, Math.round(composed.height * scale))
      out.width = fw
      out.height = fh
      outCtx.clearRect(0, 0, fw, fh)
      outCtx.imageSmoothingEnabled = true
      outCtx.imageSmoothingQuality = 'high'
      outCtx.drawImage(canvas, 0, 0, composed.width, composed.height, 0, 0, fw, fh)
      data = outCtx.getImageData(0, 0, fw, fh).data
    } else {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      data = ctx.getImageData(0, 0, fw, fh).data
    }

    if (transparent) {
      const palette = quantize(subsampleRGBA(data, PALETTE_STRIDE), 256, {
        format: 'rgba4444',
        oneBitAlpha: true,
      })
      const index = applyPalette(data, palette, 'rgba4444')
      gif.writeFrame(index, fw, fh, { palette, delay, transparent: true })
    } else {
      const palette = quantize(subsampleRGBA(data, PALETTE_STRIDE), 256)
      const index = opts.dither
        ? applyPaletteDithered(data, palette, fw, fh)
        : applyPalette(data, palette)
      gif.writeFrame(index, fw, fh, { palette, delay })
    }
    opts.onProgress?.((i + 1) / frameCount)
  }

  gif.finish()
  URL.revokeObjectURL(video.src)
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
}
