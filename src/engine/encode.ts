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
  /**
   * Dithering: reduz banding em gradientes.
   * - `'ordered'`: matriz Bayer fixa — determinística, estável entre frames
   *   (sem flicker). Recomendado para screencast.
   * - `'floyd'`: Floyd–Steinberg — melhor em gradientes, mas o padrão "anda"
   *   entre frames e pode cintilar em vídeo.
   * - `false`: mapeamento direto (mais nítido em texto, mas com banding).
   * Default false.
   */
  dither?: 'ordered' | 'floyd' | false
  /** Progresso 0..1. */
  onProgress?: (p: number) => void
}

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

/**
 * Matriz Bayer 8×8 (valores 0..63), em ordem row-major. Usada no dithering
 * ordenado: o limiar depende só da posição (x,y), nunca do conteúdo dos
 * frames vizinhos. Logo o mesmo pixel ditera sempre igual → estável no tempo
 * (sem flicker), diferente do Floyd–Steinberg cujo padrão "anda".
 */
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]

/** Amplitude do deslocamento de dither (em níveis 0..255) aplicado por pixel. */
const ORDERED_DITHER_STRENGTH = 32

/**
 * Deslocamento de dither ordenado para a posição (x,y), em [-0.5, 0.5).
 * Periódico em 8 nos dois eixos. Determinístico: depende só da posição.
 */
export function bayerOffset(x: number, y: number): number {
  return BAYER_8[(y & 7) * 8 + (x & 7)] / 64 - 0.5
}

/**
 * Mapeia RGBA → índices de palette com dithering ordenado (Bayer 8×8).
 * Soma um limiar por posição antes de buscar a cor mais próxima — quebra o
 * banding como o Floyd–Steinberg, mas sem variar entre frames.
 */
export function applyPaletteOrdered(
  rgba: Uint8ClampedArray,
  palette: number[][],
  w: number,
  h: number,
): Uint8Array {
  const index = new Uint8Array(w * h)
  const cache = new Int16Array(65536).fill(-1) // chave rgb565 → índice
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const off = bayerOffset(x, y) * ORDERED_DITHER_STRENGTH
      const i = (y * w + x) * 4
      let r = rgba[i] + off, g = rgba[i + 1] + off, b = rgba[i + 2] + off
      r = r < 0 ? 0 : r > 255 ? 255 : r
      g = g < 0 ? 0 : g > 255 ? 255 : g
      b = b < 0 ? 0 : b > 255 ? 255 : b
      const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
      let idx = cache[key]
      if (idx === -1) idx = cache[key] = nearestIndex(r, g, b, palette)
      index[y * w + x] = idx
    }
  }
  return index
}

/**
 * Limiar por canal pra considerar um pixel "mudado" entre frames. Absorve o
 * ruído do VP9 (MediaRecorder), que perturba pixels estáticos por compressão.
 */
export const DELTA_THRESHOLD = 8

/**
 * Marca os pixels que mudaram além de `threshold` por canal desde a última
 * escrita (delta encoding, técnica do gifcap). Não altera o shadow.
 */
export function diffMask(
  rgba: Uint8ClampedArray,
  shadow: Uint8ClampedArray,
  threshold: number,
): { mask: Uint8Array; count: number } {
  const n = rgba.length / 4
  const mask = new Uint8Array(n)
  let count = 0
  for (let p = 0; p < n; p++) {
    const i = p * 4
    const s = p * 3
    const dr = rgba[i] - shadow[s]
    const dg = rgba[i + 1] - shadow[s + 1]
    const db = rgba[i + 2] - shadow[s + 2]
    if (
      dr > threshold || dr < -threshold ||
      dg > threshold || dg < -threshold ||
      db > threshold || db < -threshold
    ) {
      mask[p] = 1
      count++
    }
  }
  return { mask, count }
}

/**
 * Junta num buffer compacto os pixels marcados na mask (1 a cada `stride`),
 * pra alimentar o quantize da paleta local do frame.
 */
export function collectChangedRGBA(
  rgba: Uint8ClampedArray,
  mask: Uint8Array,
  count: number,
  stride: number,
): Uint8ClampedArray {
  const st = Math.max(1, stride)
  const out = new Uint8ClampedArray(Math.ceil(count / st) * 4)
  let seen = 0
  let o = 0
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    if (seen % st === 0) {
      const i = p * 4
      out[o] = rgba[i]
      out[o + 1] = rgba[i + 1]
      out[o + 2] = rgba[i + 2]
      out[o + 3] = 255
      o += 4
    }
    seen++
  }
  return out.subarray(0, o) as Uint8ClampedArray
}

/**
 * Mapeia RGBA → índices usando a mask do delta: pixel inalterado vira
 * `transparentIndex` (com disposal 1 o GIF mantém o anterior na tela); pixel
 * mudado é mapeado com dithering ordenado e atualiza o `shadow` (3 bytes/px,
 * RGB cru da última escrita) in-place. Estático nunca re-dithera → sem flicker.
 */
export function applyPaletteOrderedMasked(
  rgba: Uint8ClampedArray,
  palette: number[][],
  w: number,
  h: number,
  mask: Uint8Array,
  transparentIndex: number,
  shadow: Uint8ClampedArray,
): Uint8Array {
  const index = new Uint8Array(w * h)
  const cache = new Int16Array(65536).fill(-1) // chave rgb565 → índice
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (!mask[p]) {
        index[p] = transparentIndex
        continue
      }
      const i = p * 4
      const s = p * 3
      const r0 = rgba[i], g0 = rgba[i + 1], b0 = rgba[i + 2]
      shadow[s] = r0
      shadow[s + 1] = g0
      shadow[s + 2] = b0
      const off = bayerOffset(x, y) * ORDERED_DITHER_STRENGTH
      let r = r0 + off, g = g0 + off, b = b0 + off
      r = r < 0 ? 0 : r > 255 ? 255 : r
      g = g < 0 ? 0 : g > 255 ? 255 : g
      b = b < 0 ? 0 : b > 255 ? 255 : b
      const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
      let idx = cache[key]
      if (idx === -1) idx = cache[key] = nearestIndex(r, g, b, palette)
      index[p] = idx
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

/**
 * Índices de frames, distribuídos uniformemente, usados pra amostrar a paleta
 * global. Inclui sempre o primeiro e o último frame. Se houver menos frames que
 * o teto, devolve todos.
 */
export function sampleFrameIndices(frameCount: number, maxSamples: number): number[] {
  const fc = Math.max(1, frameCount)
  const n = Math.max(1, Math.min(fc, maxSamples))
  if (fc <= n) return Array.from({ length: fc }, (_, i) => i)
  if (n === 1) return [0]
  const last = fc - 1
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(Math.round((i * last) / (n - 1)))
  return out
}

/** Amostra 1 a cada `stride` pixels do buffer RGBA, retornando um buffer menor. */
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

/** Nº de frames amostrados pra montar a paleta global. */
const MAX_PALETTE_SAMPLES = 32
/** Stride de pixels ao amostrar cada frame pra paleta (limita memória). */
const SAMPLE_PX_STRIDE = 4

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

  // Renderiza o frame i (seek + compose + downscale) e devolve os pixels finais.
  // Usado nos dois passes — garante que a paleta é montada sobre os MESMOS
  // pixels que serão encodados.
  async function renderFrameData(i: number): Promise<{
    data: Uint8ClampedArray
    fw: number
    fh: number
  }> {
    await seekTo(video, Math.min(start + (i / fps) * speed, end))
    const composed = compose(canvas, video, src, scene)

    // saída na resolução final (reduzida se scale < 1)
    let fw = composed.width
    let fh = composed.height
    if (scale < 1) {
      fw = Math.max(1, Math.round(composed.width * scale))
      fh = Math.max(1, Math.round(composed.height * scale))
      out.width = fw
      out.height = fh
      outCtx.clearRect(0, 0, fw, fh)
      outCtx.imageSmoothingEnabled = true
      outCtx.imageSmoothingQuality = 'high'
      outCtx.drawImage(canvas, 0, 0, composed.width, composed.height, 0, 0, fw, fh)
      return { data: outCtx.getImageData(0, 0, fw, fh).data, fw, fh }
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    return { data: ctx.getImageData(0, 0, fw, fh).data, fw, fh }
  }

  // Delta + paleta local por frame (algoritmo do gifcap) no caminho ordered +
  // fundo opaco. Uma paleta global de 256 cores não cobre uma UI inteira (ex:
  // tema dark vira ~12 tons de cinza com manchas); a paleta local dá 255 cores
  // só pros pixels que mudaram, e o delta garante que o estático fica intacto
  // (sem flicker) e que o quantize roda só sobre a região alterada (rápido).
  const useDelta = !transparent && opts.dither === 'ordered'

  // --- paleta global única: só nos caminhos sem delta ---
  let palette: number[][] | null = null
  if (!useDelta) {
    const sampleIdx = sampleFrameIndices(frameCount, MAX_PALETTE_SAMPLES)
    const chunks: Uint8ClampedArray[] = []
    let sampleLen = 0
    for (const i of sampleIdx) {
      const { data } = await renderFrameData(i)
      const s = subsampleRGBA(data, SAMPLE_PX_STRIDE)
      chunks.push(s)
      sampleLen += s.length
    }
    const sampleBuf = new Uint8ClampedArray(sampleLen)
    for (let off = 0, k = 0; k < chunks.length; k++) {
      sampleBuf.set(chunks[k], off)
      off += chunks[k].length
    }
    palette = transparent
      ? quantize(sampleBuf, 256, { format: 'rgba4444', oneBitAlpha: true })
      : quantize(sampleBuf, 256)
  }

  // Estado do delta: RGB cru da última escrita por pixel + última paleta local
  // (reusada quando um frame não muda nada).
  let shadow: Uint8ClampedArray | null = null
  let lastPalette: number[][] = []
  let lastTransparentIndex = -1

  for (let i = 0; i < frameCount; i++) {
    const { data, fw, fh } = await renderFrameData(i)
    if (transparent) {
      const index = applyPalette(data, palette!, 'rgba4444')
      gif.writeFrame(index, fw, fh, { palette: palette!, delay, transparent: true })
    } else if (useDelta) {
      if (!shadow) {
        // primeiro frame: paleta local do frame inteiro, escreve tudo
        shadow = new Uint8ClampedArray(fw * fh * 3)
        for (let p = 0; p < fw * fh; p++) {
          shadow[p * 3] = data[p * 4]
          shadow[p * 3 + 1] = data[p * 4 + 1]
          shadow[p * 3 + 2] = data[p * 4 + 2]
        }
        const pal = quantize(subsampleRGBA(data, 2), 255)
        pal.push([0, 0, 0]) // slot transparente (cor irrelevante)
        const index = applyPaletteOrdered(data, pal, fw, fh)
        gif.writeFrame(index, fw, fh, { palette: pal, delay, dispose: 1 })
        lastPalette = pal
        lastTransparentIndex = pal.length - 1
      } else {
        const { mask, count } = diffMask(data, shadow, DELTA_THRESHOLD)
        if (count === 0) {
          // nada mudou: frame inteiro transparente (mantém a tela anterior)
          const index = new Uint8Array(fw * fh).fill(lastTransparentIndex)
          gif.writeFrame(index, fw, fh, {
            palette: lastPalette, delay,
            transparent: true, transparentIndex: lastTransparentIndex, dispose: 1,
          })
        } else {
          // paleta local só dos pixels alterados (255 cores pro delta)
          const stride = count > 250_000 ? 4 : 1
          const pal = quantize(collectChangedRGBA(data, mask, count, stride), 255)
          pal.push([0, 0, 0])
          const transparentIndex = pal.length - 1
          const index = applyPaletteOrderedMasked(
            data, pal, fw, fh, mask, transparentIndex, shadow,
          )
          gif.writeFrame(index, fw, fh, {
            palette: pal, delay, transparent: true, transparentIndex, dispose: 1,
          })
          lastPalette = pal
          lastTransparentIndex = transparentIndex
        }
      }
    } else {
      const index =
        opts.dither === 'floyd'
          ? applyPaletteDithered(data, palette!, fw, fh)
          : applyPalette(data, palette!)
      gif.writeFrame(index, fw, fh, { palette: palette!, delay })
    }
    opts.onProgress?.((i + 1) / frameCount)
  }

  gif.finish()
  URL.revokeObjectURL(video.src)
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
}
