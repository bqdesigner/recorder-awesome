/** Exporta um webm gravado como MP4 (H.264) via WebCodecs + mp4-muxer. */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { compose, composedSize, type Scene } from './compose'
import { halvingSteps, unsharpMask } from './sharpen'
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
  /** Fator de redução da saída (1 = resolução composta original). Default 1. */
  scale?: number
  onProgress?: (p: number) => void
}

/**
 * Teto da maior dimensão no modo "Auto" do MP4. Mais alto que o do GIF
 * (`DEFAULT_MAX_DIMENSION`): o teto do GIF é calibrado pelo peso por frame
 * daquele formato, curto demais para vídeo.
 */
export const MP4_MAX_DIMENSION = 1920

/** Quadros por segundo da saída MP4. */
export const MP4_FPS = 30

/**
 * Bitrate alvo do encoder: ~0,2 bit por pixel por frame, teto de 50 Mbps —
 * folgado o bastante pra texto de UI não virar bloco. Exportado porque a
 * estimativa de peso na interface precisa sair desta mesma conta.
 */
export function mp4Bitrate(width: number, height: number, fps = MP4_FPS) {
  return Math.min(50_000_000, Math.round(width * height * fps * 0.2))
}

/**
 * Dimensões de saída do MP4 a partir da cena composta e do fator de escala.
 * Arredonda pra cima até par porque H.264 (subamostragem 4:2:0) não aceita
 * lado ímpar, e nunca devolve menos que 2×2. Pura — testável sem canvas.
 */
export function mp4OutputSize(width: number, height: number, scale: number) {
  const s = Math.min(1, Math.max(0.01, scale))
  const w = Math.max(1, Math.round(width * s))
  const h = Math.max(1, Math.round(height * s))
  return { width: w + (w % 2), height: h + (h % 2) }
}

const DEFAULT_SCENE: Scene = {
  frame: null,
  background: '#000',
  fit: 'fit',
  padding: 0,
}

/** Escolhe um perfil H.264 suportado para as dimensões dadas. */
async function pickCodec(width: number, height: number, fps: number, bitrate: number) {
  // Levels 4.0/3.1 (sufixo `28`/`1F`) travam em ~1080p: acima disso o
  // isConfigSupported do Chrome recusa os quatro primeiros e só os de level
  // 5.1/5.2 (`33`/`34`) passam. Ordem = menor level suficiente primeiro, que é
  // o mais compatível com players antigos.
  const candidates = [
    'avc1.640028',
    'avc1.4D0028',
    'avc1.42E028',
    'avc1.42E01F',
    'avc1.640033',
    'avc1.640034',
  ]
  for (const codec of candidates) {
    const sup = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate, framerate: fps })
    if (sup.supported) return codec
  }
  throw new Error(`Nenhum perfil H.264 suportado para ${width}×${height}`)
}

export async function webmToMp4(
  blob: Blob,
  duration: number,
  opts: Mp4Options = {},
): Promise<Blob> {
  const fps = opts.fps ?? MP4_FPS
  const { video, duration: realDuration } = await loadVideo(blob, duration)

  const vw = video.videoWidth
  const vh = video.videoHeight
  // crop em pixel inteiro: fracionário faz o drawImage reamostrar o frame
  // todo em subpixel e borra o texto (mesmo fix do GIF em encode.ts).
  const crop = opts.crop
  const src = {
    x: crop ? Math.round(crop.x * vw) : 0,
    y: crop ? Math.round(crop.y * vh) : 0,
    w: crop ? Math.max(1, Math.round(crop.w * vw)) : vw,
    h: crop ? Math.max(1, Math.round(crop.h * vh)) : vh,
  }
  const scene = opts.scene ?? DEFAULT_SCENE
  const scale = Math.min(1, Math.max(0.01, opts.scale ?? 1))

  const size = composedSize(scene, src.w, src.h)
  const { width: W, height: H } = mp4OutputSize(size.width, size.height, scale)

  const work = document.createElement('canvas')
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const outCtx = out.getContext('2d', { willReadFrequently: scale < 1 })!
  // scratch do downscale progressivo (ping-pong entre os dois, nunca lendo e
  // escrevendo o mesmo canvas no mesmo draw). Só usados com scale < 1.
  const s1 = document.createElement('canvas')
  const s2 = document.createElement('canvas')
  const pool = [
    { c: s1, x: s1.getContext('2d', { willReadFrequently: true })! },
    { c: s2, x: s2.getContext('2d', { willReadFrequently: true })! },
  ]

  const bitrate = mp4Bitrate(W, H, fps)
  const codec = await pickCodec(W, H, fps, bitrate)

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H },
    fastStart: 'in-memory',
  })
  // erro do encoder chega por callback assíncrono: `throw` aqui dentro viraria
  // unhandled rejection e o export terminaria em silêncio. Guarda e relança no
  // fluxo await'ado, onde a UI consegue capturar.
  let encodeError: DOMException | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError ??= e
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
    if (encodeError) throw encodeError
    await seekTo(video, Math.min(start + (i / fps) * speed, end))
    compose(work, video, src, scene)
    if (scale < 1) {
      // redução em saltos de ~2× em vez de um salto bilinear só: preserva mais
      // detalhe de texto/borda (mesma técnica do GIF em encode.ts).
      let curC: HTMLCanvasElement = work
      let curX = pool[0].x
      let curW = work.width
      let curH = work.height
      for (const s of halvingSteps(work.width, work.height, W, H)) {
        const dst = pool.find((p) => p.c !== curC)!
        dst.c.width = s.w
        dst.c.height = s.h
        dst.x.clearRect(0, 0, s.w, s.h)
        dst.x.imageSmoothingEnabled = true
        dst.x.imageSmoothingQuality = 'high'
        dst.x.drawImage(curC, 0, 0, curW, curH, 0, 0, s.w, s.h)
        curC = dst.c
        curX = dst.x
        curW = s.w
        curH = s.h
      }
      // unsharp recupera a nitidez de borda perdida na redução
      const img = curX.getImageData(0, 0, W, H)
      unsharpMask(img.data, W, H)
      outCtx.putImageData(img, 0, 0)
    } else {
      outCtx.drawImage(work, 0, 0)
    }
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
  if (encodeError) throw encodeError
  muxer.finalize()
  URL.revokeObjectURL(video.src)
  return new Blob([muxer.target.buffer as BlobPart], { type: 'video/mp4' })
}
