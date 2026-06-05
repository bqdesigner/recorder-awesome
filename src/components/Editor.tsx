import { useEffect, useRef, useState } from 'react'
import { webmToGif, compose, FRAMES, type Crop, type Scene, type Fit } from '../engine'
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

type Step = 'edit' | 'format' | 'export'
type Corner = 'nw' | 'ne' | 'sw' | 'se'
type Drag =
  | { mode: 'new'; ox: number; oy: number } // âncora = ponto inicial
  | { mode: 'resize'; ox: number; oy: number } // âncora = canto oposto
  | { mode: 'move'; dx: number; dy: number } // offset do ponteiro até o canto sup-esq

const STEPS: { id: Step; label: string }[] = [
  { id: 'edit', label: 'Editar' },
  { id: 'format', label: 'Formatar' },
  { id: 'export', label: 'Exportar' },
]

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
  const [frameId, setFrameId] = useState('none')
  const [background, setBackground] = useState('#1e1e1e')
  const [screenFill, setScreenFill] = useState('#000000')
  const [fit, setFit] = useState<Fit>('fit')
  const [step, setStep] = useState<Step>('edit')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [ready, setReady] = useState(false)
  const trimRef = useRef({ start: 0, end: estDuration })

  const frame = frameId === 'none' ? null : FRAMES.find((f) => f.id === frameId) ?? null
  const scene: Scene = { frame, background, fit, padding: frame ? 48 : 0, screenFill }
  // na edição mostramos o vídeo cru (sem moldura); só formatação/exportação compõem
  const drawScene: Scene = step === 'edit' ? { ...scene, frame: null, padding: 0 } : scene

  // desenha o frame atual no canvas
  function drawFrame() {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c || !v.videoWidth) return
    const vw = v.videoWidth
    const vh = v.videoHeight
    // no modo recorte mostramos o frame cru, pra selecionar a região
    if (cropMode) {
      c.width = vw
      c.height = vh
      c.getContext('2d')!.drawImage(v, 0, 0)
      return
    }
    const src = crop
      ? { x: crop.x * vw, y: crop.y * vh, w: crop.w * vw, h: crop.h * vh }
      : { x: 0, y: 0, w: vw, h: vh }
    compose(c, v, src, drawScene)
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
        setReady(true) // libera o loop de reprodução só após medir a duração
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

  // redesenha ao mudar recorte / moldura / background / encaixe
  useEffect(() => {
    drawRef.current()
  }, [crop, cropMode, frameId, background, screenFill, fit, step])

  // mantém o trecho do trim acessível ao loop sem fechar sobre estado obsoleto
  useEffect(() => {
    trimRef.current = { start: trimStart, end: trimEnd }
  }, [trimStart, trimEnd])

  // loop de reprodução: roda a gravação dentro do trecho do trim
  useEffect(() => {
    const v = videoRef.current
    if (!v || !ready) return
    if (!playing) {
      v.pause()
      return
    }
    let raf = 0
    v.play().catch(() => {})
    const tick = () => {
      const { start, end } = trimRef.current
      if (v.currentTime >= end - 0.02 || v.currentTime < start) v.currentTime = start
      drawRef.current()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, ready])

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
  const drag = useRef<Drag | null>(null)
  function frac(e: React.PointerEvent) {
    const r = overlayRef.current!.getBoundingClientRect()
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    }
  }
  /** Qual canto do crop está sob o ponteiro (margem de 16px), se algum. */
  function hitCorner(e: React.PointerEvent, c: Crop): Corner | null {
    const r = overlayRef.current!.getBoundingClientRect()
    const corners: Record<Corner, [number, number]> = {
      nw: [c.x, c.y],
      ne: [c.x + c.w, c.y],
      sw: [c.x, c.y + c.h],
      se: [c.x + c.w, c.y + c.h],
    }
    for (const k of Object.keys(corners) as Corner[]) {
      const [fx, fy] = corners[k]
      const px = r.left + fx * r.width
      const py = r.top + fy * r.height
      if (Math.hypot(e.clientX - px, e.clientY - py) <= 16) return k
    }
    return null
  }
  function onPointerDown(e: React.PointerEvent) {
    overlayRef.current!.setPointerCapture(e.pointerId)
    const p = frac(e)
    const corner = crop ? hitCorner(e, crop) : null
    if (crop && corner) {
      // âncora = canto oposto ao agarrado
      const ox = corner === 'nw' || corner === 'sw' ? crop.x + crop.w : crop.x
      const oy = corner === 'nw' || corner === 'ne' ? crop.y + crop.h : crop.y
      drag.current = { mode: 'resize', ox, oy }
    } else if (crop && inside(p, crop)) {
      drag.current = { mode: 'move', dx: p.x - crop.x, dy: p.y - crop.y }
    } else {
      drag.current = { mode: 'new', ox: p.x, oy: p.y }
      setCrop(null)
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const p = frac(e)
    if (d.mode === 'move') {
      setCrop((c) =>
        c
          ? {
              ...c,
              x: Math.max(0, Math.min(p.x - d.dx, 1 - c.w)),
              y: Math.max(0, Math.min(p.y - d.dy, 1 - c.h)),
            }
          : c,
      )
    } else {
      setCrop({
        x: Math.min(d.ox, p.x),
        y: Math.min(d.oy, p.y),
        w: Math.abs(p.x - d.ox),
        h: Math.abs(p.y - d.oy),
      })
    }
  }
  function onPointerUp() {
    drag.current = null
    setCrop((c) => (c && c.w > MIN_CROP && c.h > MIN_CROP ? c : null))
  }

  async function handleExport() {
    setExporting(true)
    setProgress(0)
    const gif = await webmToGif(blob, duration, {
      start: trimStart,
      end: trimEnd,
      crop: crop ?? undefined,
      scene,
      onProgress: setProgress,
    })
    download(gif, 'gravacao.gif')
    setExporting(false)
  }

  return (
    <div className="editor">
      <video ref={videoRef} src={previewUrl} muted playsInline className="source" />

      <ol className="stepper">
        {STEPS.map((s, i) => (
          <li key={s.id} className={s.id === step ? 'on' : ''}>
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <div className="stage">
        <canvas ref={canvasRef} className="preview" />
        <div
          ref={overlayRef}
          className={`crop-layer${step === 'edit' && cropMode ? ' active' : ''}`}
          onPointerDown={cropMode ? onPointerDown : undefined}
          onPointerMove={cropMode ? onPointerMove : undefined}
          onPointerUp={cropMode ? onPointerUp : undefined}
        >
          {step === 'edit' && cropMode && crop && (
            <div
              className="crop-rect"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
            >
              <span className="handle nw" />
              <span className="handle ne" />
              <span className="handle sw" />
              <span className="handle se" />
            </div>
          )}
        </div>
      </div>

      <div className="playbar">
        <button onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ Pausar' : '▶ Reproduzir'}
        </button>
      </div>

      {/* Etapa 1: editar (trim + crop) */}
      {step === 'edit' && (
        <>
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
            <button onClick={() => setCropMode((m) => !m)} aria-pressed={cropMode}>
              {cropMode ? 'Concluir recorte' : 'Recortar'}
            </button>
            {crop && <button onClick={() => setCrop(null)}>Limpar recorte</button>}
            <button onClick={onReset}>Nova gravação</button>
            <button
              className="primary"
              onClick={() => {
                setCropMode(false)
                setStep('format')
              }}
            >
              Avançar →
            </button>
          </div>
        </>
      )}

      {/* Etapa 2: formatar (moldura, background, fit, cor da tela) */}
      {step === 'format' && (
        <>
          <div className="format">
            <label>
              Moldura
              <select value={frameId} onChange={(e) => setFrameId(e.target.value)}>
                <option value="none">Nenhuma</option>
                {FRAMES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Background
              <input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </label>
            <label>
              Encaixe
              <select value={fit} onChange={(e) => setFit(e.target.value as Fit)}>
                <option value="fit">Cabe inteiro (fit)</option>
                <option value="fill">Preenche (fill)</option>
              </select>
            </label>
            {frame && (
              <label>
                Cor da tela
                <input
                  type="color"
                  value={screenFill}
                  onChange={(e) => setScreenFill(e.target.value)}
                />
              </label>
            )}
          </div>
          <div className="actions">
            <button onClick={() => setStep('edit')}>← Voltar</button>
            <button className="primary" onClick={() => setStep('export')}>
              Avançar →
            </button>
          </div>
        </>
      )}

      {/* Etapa 3: exportar */}
      {step === 'export' && (
        <div className="actions">
          <button onClick={() => setStep('format')} disabled={exporting}>
            ← Voltar
          </button>
          <button onClick={onReset} disabled={exporting}>
            Nova gravação
          </button>
          <button className="primary" onClick={handleExport} disabled={exporting}>
            {exporting ? `Exportando… ${Math.round(progress * 100)}%` : 'Exportar GIF'}
          </button>
        </div>
      )}
    </div>
  )
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function inside(p: { x: number; y: number }, c: Crop) {
  return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h
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
