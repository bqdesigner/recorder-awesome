/** Helpers de leitura de frames de um webm gravado (compartilhado GIF/MP4). */

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

export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

export interface LoadedVideo {
  video: HTMLVideoElement
  duration: number
}

export function loadVideo(blob: Blob, fallbackDuration: number): Promise<LoadedVideo> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = URL.createObjectURL(blob)
    video.onloadedmetadata = async () => {
      let duration = await fixDuration(video)
      if (!isFinite(duration) || duration <= 0) duration = fallbackDuration
      resolve({ video, duration })
    }
    video.onerror = () => reject(new Error('Falha ao carregar o vídeo gravado'))
  })
}
