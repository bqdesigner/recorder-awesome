import { useEffect, useRef, useState } from 'react'
import { webmToGif, type Crop } from '../engine'
import DualRange from './DualRange'
import './Editor.css'

interface Props {
  blob: Blob
  /** Duração estimada da gravação (s). */
  duration: number
  previewUrl: string
  onReset: () => void
}

const MIN_CROP = 0.02 // recortes menores que isso = limpar

function Editor({ blob, duration: estDuration, previewUrl, onReset }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const drawRef = useRef<() => void>(() => {})

  const [duration, setDuration] = useState(estDuration)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(estDuration)
  const [crop, setCrop] = useState<Crop | null>(null)
  const [cropMode, setCropMode] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  // desenha o frame atual no canvas (frame inteiro, ou só o recorte se confirmado)
  function drawFrame() {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c || !v.videoWidth) return
    const vw = v.videoWidth
    const vh = v.videoHeight
    const applied = crop && !cropMode
    const sx = applied ? crop.x * vw : 0
    const sy = applied ? crop.y * vh : 0
    const sw = applied ? crop.w * vw : vw
    const sh = applied ? crop.h * vh : vh
    c.width = Math.round(sw)
    c.height = Math.round(sh)
    c.getContext('2d')!.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height)
  }
  // mantém o ref com a versão atual (usado pelo listener 'seeked')
  useEffect(() => {
    drawRef.current = drawFrame
  })

  // setup: mede a duração real e desenha o primeiro frame
  useEffect(() => {
    const v = videoRef.current!
    let cancelled = false
    const onSeeked = () => drawRef.current()
    v.addEventListener('seeked', onSeeked)

    const ready = () => {
      const finish = (d: number) => {
        if (cancelled) return
        if (isFinite(d) && d > 0) {
          setDuration(d)
          setTrimEnd(d)
        }
        v.currentTime = 0
      }
      if (isFinite(v.duration) && v.duration > 0) {
        finish(v.duration)
      } else {
        const once = () => {
          v.removeEventListener('seeked', once)
          finish(v.duration)
        }
        v.addEventListener('seeked', once)
        v.currentTime = 1e7 // força o cálculo da duração real
      }
    }
    if (v.readyState >= 1) ready()
    else v.addEventListener('loadedmetadata', ready, { once: true })

    return () => {
      cancelled = true
      v.removeEventListener('seeked', onSeeked)
    }
  }, [])

  // redesenha ao alternar recorte / modo
  useEffect(() => {
    drawRef.current()
  }, [crop, cropMode])

  function seek(t: number) {
    if (videoRef.current) videoRef.current.currentTime = t
  }
  function changeStart(v: number) {
    setTrimStart(v)
    seek(v)
  }
  function changeEnd(v: number) {
    setTrimEnd(v)
    seek(v)
  }

  // --- crop (frações 0..1 sobre o frame exibido) ---
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  function frac(e: React.PointerEvent) {
    const r = overlayRef.current!.getBoundingClientRect()
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    }
  }
  function onPointerDown(e: React.PointerEvent) {
    overlayRef.current!.setPointerCapture(e.pointerId)
    dragStart.current = frac(e)
    setCrop(null)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const p = frac(e)
    const s = dragStart.current
    setCrop({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    })
  }
  function onPointerUp() {
    dragStart.current = null
    setCrop((c) => (c && c.w > MIN_CROP && c.h > MIN_CROP ? c : null))
  }

  async function handleExport() {
    setExporting(true)
    setProgress(0)
    const gif = await webmToGif(blob, duration, {
      start: trimStart,
      end: trimEnd,
      crop: crop ?? undefined,
      onProgress: setProgress,
    })
    download(gif, 'gravacao.gif')
    setExporting(false)
  }

  return (
    <div className="editor">
      <video ref={videoRef} src={previewUrl} muted playsInline className="source" />

      <div className="stage">
        <canvas ref={canvasRef} className="preview" />
        <div
          ref={overlayRef}
          className={`crop-layer${cropMode ? ' active' : ''}`}
          onPointerDown={cropMode ? onPointerDown : undefined}
          onPointerMove={cropMode ? onPointerMove : undefined}
          onPointerUp={cropMode ? onPointerUp : undefined}
        >
          {cropMode && crop && (
            <div
              className="crop-rect"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      <div className="controls">
        <DualRange
          min={0}
          max={duration}
          start={trimStart}
          end={trimEnd}
          onStart={changeStart}
          onEnd={changeEnd}
        />
        <p className="hint">
          {trimStart.toFixed(1)}s – {trimEnd.toFixed(1)}s ·{' '}
          {(trimEnd - trimStart).toFixed(1)}s ·{' '}
          {cropMode
            ? 'arraste no frame pra recortar'
            : crop
              ? 'recorte aplicado'
              : 'frame inteiro'}
        </p>
      </div>

      <div className="actions">
        <button
          onClick={() => setCropMode((m) => !m)}
          disabled={exporting}
          aria-pressed={cropMode}
        >
          {cropMode ? 'Concluir recorte' : 'Recortar'}
        </button>
        {crop && (
          <button onClick={() => setCrop(null)} disabled={exporting}>
            Limpar recorte
          </button>
        )}
        <button onClick={handleExport} disabled={exporting}>
          {exporting ? `Exportando… ${Math.round(progress * 100)}%` : 'Exportar GIF'}
        </button>
        <button onClick={onReset} disabled={exporting}>
          Nova gravação
        </button>
      </div>
    </div>
  )
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default Editor
