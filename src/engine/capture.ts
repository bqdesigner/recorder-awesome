/** Gravação de tela via getDisplayMedia + MediaRecorder. Sai em webm. */

export interface Recording {
  blob: Blob
  /** Duração em segundos (estimada pelo tempo de gravação). */
  duration: number
}

export interface RecordingSession {
  /** Para a gravação e resolve com o webm. */
  stop: () => Promise<Recording>
  /** Stream ativo (para preview ao vivo, se necessário). */
  stream: MediaStream
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
}

/**
 * Pede a tela ao usuário e começa a gravar.
 * Se o usuário encerrar o compartilhamento pelo browser, a sessão para sozinha
 * e o `stop()` pendente resolve mesmo assim.
 */
export async function startRecording(): Promise<RecordingSession> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 30 },
      width: { ideal: 3840 },
      height: { ideal: 2160 },
    },
    audio: false,
  })

  const mimeType = pickMimeType()
  // bitrate alto evita texto borrado/blocado; escala com a resolução capturada.
  // ~0.2 bit por pixel por frame, com teto de 50 Mbps.
  const { width = 1920, height = 1080, frameRate = 30 } =
    stream.getVideoTracks()[0]?.getSettings() ?? {}
  const videoBitsPerSecond = Math.min(
    50_000_000,
    Math.round(width * height * frameRate * 0.2),
  )
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond })
  const chunks: Blob[] = []
  const startedAt = performance.now()

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()

  let stopResolve: ((r: Recording) => void) | null = null
  const stopped = new Promise<Recording>((resolve) => {
    stopResolve = resolve
  })

  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop())
    const blob = new Blob(chunks, { type: mimeType })
    const duration = (performance.now() - startedAt) / 1000
    stopResolve?.({ blob, duration })
  }

  // Usuário clicou "parar de compartilhar" na UI do browser.
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (recorder.state !== 'inactive') recorder.stop()
  })

  return {
    stream,
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop()
      return stopped
    },
  }
}
