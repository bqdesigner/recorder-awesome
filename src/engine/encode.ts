/** Exporta um webm gravado como GIF, amostrando frames via <video> + canvas. */

import { GIFEncoder, quantize, applyPalette } from 'gifenc'

export interface GifOptions {
  /** Quadros por segundo do GIF. Default 12. */
  fps?: number
  /** Largura máxima em px; mantém proporção. Default 640. */
  maxWidth?: number
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
  const maxWidth = opts.maxWidth ?? 640

  const video = await loadVideo(blob, duration)
  const realDuration =
    (video as HTMLVideoElement & { _duration: number })._duration

  const scale = Math.min(1, maxWidth / video.videoWidth)
  const width = Math.round(video.videoWidth * scale)
  const height = Math.round(video.videoHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  const gif = GIFEncoder()
  const delay = Math.round(1000 / fps)
  const frameCount = Math.max(1, Math.round(realDuration * fps))

  for (let i = 0; i < frameCount; i++) {
    await seekTo(video, i / fps)
    ctx.drawImage(video, 0, 0, width, height)
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
