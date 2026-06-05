/** Exporta um webm gravado como GIF, amostrando frames via <video> + canvas. */

import { GIFEncoder, quantize, applyPalette } from 'gifenc'

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
  /** Largura máxima em px; mantém proporção. Default = resolução original. */
  maxWidth?: number
  /** Início do trecho em segundos. Default 0. */
  start?: number
  /** Fim do trecho em segundos. Default = duração. */
  end?: number
  /** Recorte da região. Default = frame inteiro. */
  crop?: Crop
  /** Progresso 0..1. */
  onProgress?: (p: number) => void
}

/** MediaRecorder costuma reportar duration = Infinity até um seek forçado. */
function fixDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if (isFinite(video.duration) && video.duration > 0) {
      resolve(video.duration)
      return
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.currentTime = 0
      resolve(video.duration)
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = 1e7 // força o browser a calcular a duração real
  })
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

function loadVideo(blob: Blob, fallbackDuration: number): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = URL.createObjectURL(blob)
    video.onloadedmetadata = async () => {
      let duration = await fixDuration(video)
      if (!isFinite(duration) || duration <= 0) duration = fallbackDuration
      // guarda a duração corrigida no elemento
      ;(video as HTMLVideoElement & { _duration: number })._duration = duration
      resolve(video)
    }
    video.onerror = () => reject(new Error('Falha ao carregar o vídeo gravado'))
  })
}

export async function webmToGif(
  blob: Blob,
  duration: number,
  opts: GifOptions = {},
): Promise<Blob> {
  const fps = opts.fps ?? 12

  const video = await loadVideo(blob, duration)
  const realDuration =
    (video as HTMLVideoElement & { _duration: number })._duration

  const vw = video.videoWidth
  const vh = video.videoHeight

  // região de origem (crop em px), default frame inteiro
  const crop = opts.crop
  const sx = crop ? crop.x * vw : 0
  const sy = crop ? crop.y * vh : 0
  const sw = crop ? crop.w * vw : vw
  const sh = crop ? crop.h * vh : vh

  // sem maxWidth = resolução original (frame/crop em px nativos)
  const scale = opts.maxWidth ? Math.min(1, opts.maxWidth / sw) : 1
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // trecho a exportar (trim)
  const start = Math.max(0, opts.start ?? 0)
  const end = Math.min(realDuration, opts.end ?? realDuration)
  const span = Math.max(0, end - start)

  const gif = GIFEncoder()
  const delay = Math.round(1000 / fps)
  const frameCount = Math.max(1, Math.round(span * fps))

  for (let i = 0; i < frameCount; i++) {
    await seekTo(video, start + i / fps)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height)
    const { data } = ctx.getImageData(0, 0, width, height)
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, width, height, { palette, delay })
    opts.onProgress?.((i + 1) / frameCount)
  }

  gif.finish()
  URL.revokeObjectURL(video.src)
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
}
