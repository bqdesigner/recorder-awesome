/** Exporta um webm gravado como GIF, amostrando frames via <video> + canvas. */

import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { compose, type Scene } from './compose'

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
  /** Progresso 0..1. */
  onProgress?: (p: number) => void
}

const DEFAULT_SCENE: Scene = {
  frame: null,
  background: '#000',
  fit: 'fit',
  padding: 0,
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
  const src = {
    x: crop ? crop.x * vw : 0,
    y: crop ? crop.y * vh : 0,
    w: crop ? crop.w * vw : vw,
    h: crop ? crop.h * vh : vh,
  }
  const scene = opts.scene ?? DEFAULT_SCENE

  const canvas = document.createElement('canvas')

  // trecho a exportar (trim)
  const start = Math.max(0, opts.start ?? 0)
  const end = Math.min(realDuration, opts.end ?? realDuration)
  const span = Math.max(0, end - start)

  const gif = GIFEncoder()
  const delay = Math.round(1000 / fps)
  const frameCount = Math.max(1, Math.round(span * fps))

  for (let i = 0; i < frameCount; i++) {
    await seekTo(video, start + i / fps)
    const { width, height } = compose(canvas, video, src, scene)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
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
