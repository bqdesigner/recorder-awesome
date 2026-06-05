/** Exporta um webm gravado como MP4 (H.264) via WebCodecs + mp4-muxer. */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { compose, composedSize, type Scene } from './compose'
import { loadVideo, seekTo } from './video'
import type { Crop } from './encode'

export interface Mp4Options {
  /** Quadros por segundo. Default 30. */
  fps?: number
  start?: number
  end?: number
  crop?: Crop
  scene?: Scene
  /** Multiplicador de velocidade (2 = 2x mais rápido). Default 1. */
  speed?: number
  onProgress?: (p: number) => void
}

const DEFAULT_SCENE: Scene = {
  frame: null,
  background: '#000',
  fit: 'fit',
  padding: 0,
}

/** Escolhe um perfil H.264 suportado para as dimensões dadas. */
async function pickCodec(width: number, height: number, fps: number, bitrate: number) {
  const candidates = ['avc1.640028', 'avc1.4D0028', 'avc1.42E028', 'avc1.42E01F']
  for (const codec of candidates) {
    const sup = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate: fps })
    if (sup.supported) return codec
  }
  throw new Error('Nenhum perfil H.264 suportado para essas dimensões')
}

export async function webmToMp4(
  blob: Blob,
  duration: number,
  opts: Mp4Options = {},
): Promise<Blob> {
  const fps = opts.fps ?? 30
  const { video, duration: realDuration } = await loadVideo(blob, duration)

  const vw = video.videoWidth
  const vh = video.videoHeight
  const crop = opts.crop
  const src = {
    x: crop ? crop.x * vw : 0,
    y: crop ? crop.y * vh : 0,
    w: crop ? crop.w * vw : vw,
    h: crop ? crop.h * vh : vh,
  }
  const scene = opts.scene ?? DEFAULT_SCENE

  // H.264 exige dimensões pares
  const size = composedSize(scene, src.w, src.h)
  const W = size.width + (size.width % 2)
  const H = size.height + (size.height % 2)

  const work = document.createElement('canvas')
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const outCtx = out.getContext('2d')!

  const bitrate = 8_000_000
  const codec = await pickCodec(W, H, fps, bitrate)

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H },
    fastStart: 'in-memory',
  })
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      throw e
    },
  })
  encoder.configure({ codec, width: W, height: H, bitrate, framerate: fps })

  const speed = opts.speed ?? 1
  const start = Math.max(0, opts.start ?? 0)
  const end = Math.min(realDuration, opts.end ?? realDuration)
  const span = Math.max(0, end - start)
  const frameCount = Math.max(1, Math.round((span / speed) * fps))
  const frameDur = 1e6 / fps // microssegundos

  for (let i = 0; i < frameCount; i++) {
    await seekTo(video, Math.min(start + (i / fps) * speed, end))
    compose(work, video, src, scene)
    outCtx.drawImage(work, 0, 0)
    const frame = new VideoFrame(out, {
      timestamp: Math.round(i * frameDur),
      duration: Math.round(frameDur),
    })
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
    frame.close()
    // evita acumular muitos frames na fila do encoder
    while (encoder.encodeQueueSize > 10) {
      await new Promise((r) => setTimeout(r, 0))
    }
    opts.onProgress?.((i + 1) / frameCount)
  }

  await encoder.flush()
  muxer.finalize()
  URL.revokeObjectURL(video.src)
  return new Blob([muxer.target.buffer as BlobPart], { type: 'video/mp4' })
}
