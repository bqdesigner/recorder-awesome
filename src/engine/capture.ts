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
    video: true,
    audio: false,
  })

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, { mimeType })
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
