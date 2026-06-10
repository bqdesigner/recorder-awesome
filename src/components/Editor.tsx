import { useEffect, useRef, useState } from 'react'
import {
  webmToGif,
  webmToMp4,
  compose,
  composedSize,
  FRAMES,
  type Crop,
  type Scene,
  type Fit,
} from '../engine'
import Accordion from './Accordion'
import ColorPicker from './ColorPicker'
import Footer from './Footer'
import DualRange from './DualRange'
import '../App.css'
import './Editor.css'

interface Props {
  blob: Blob
  /** Duração estimada da gravação (s). */
  duration: number
  previewUrl: string
  onReset: () => void
}

const MIN_CROP = 0.02 // recortes menores que isso = limpar

type Section = 'edit' | 'format' | 'export'
type Corner = 'nw' | 'ne' | 'sw' | 'se'
type Drag =
  | { mode: 'new'; ox: number; oy: number } // âncora = ponto inicial
  | { mode: 'resize'; ox: number; oy: number } // âncora = canto oposto
  | { mode: 'move'; dx: number; dy: number } // offset do ponteiro até o canto sup-esq

type ExportState = { kind: 'idle' } | { kind: 'download'; progress: number }

// ordem das seções para o gating sequencial (editar → formatar → exportar)
const ORDER: Section[] = ['edit', 'format', 'export']

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
  const [bgTransparent, setBgTransparent] = useState(false)
  const [screenFill, setScreenFill] = useState('#000000')
  const [fit, setFit] = useState<Fit>('fit')
  const [format, setFormat] = useState<'gif' | 'mp4'>('gif')
  const [speed, setSpeed] = useState(1)
  const [fps, setFps] = useState(15)
  const [scale, setScale] = useState(1)
  const [playing, setPlaying] = useState(true)
  const [playhead, setPlayhead] = useState(0)
  const [ready, setReady] = useState(false)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  // navegação: qual seção está aberta + até onde o fluxo foi liberado
  const [open, setOpen] = useState<Section | null>('edit')
  const [maxUnlocked, setMaxUnlocked] = useState(0) // 0=edit, 1=format, 2=export
  const [exportState, setExportState] = useState<ExportState>({ kind: 'idle' })

  const trimRef = useRef({ start: 0, end: estDuration })
  // dithering desligado: em screencast o padrão de difusão de erro "anda" entre
  // frames e gera cintilação (flicker); flat mapping fica estável e nítido.
  const dither = false

  const unlocked = (s: Section) => ORDER.indexOf(s) <= maxUnlocked
  const busy = exportState.kind === 'download'

  const frame = frameId === 'none' ? null : FRAMES.find((f) => f.id === frameId) ?? null
  const scene: Scene = {
    frame,
    background: bgTransparent ? 'transparent' : background,
    fit,
    padding: frame ? 48 : 0,
    screenFill,
  }
  // na edição mostramos o vídeo cru (sem moldura); formatar/exportar compõem
  const drawScene: Scene =
    open === 'edit' ? { ...scene, frame: null, padding: 0 } : scene

  // desenha o frame atual no canvas
  function drawFrame() {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c || !v.videoWidth) return
    const vw = v.videoWidth
    const vh = v.videoHeight
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
        if (v.videoWidth) setDims({ w: v.videoWidth, h: v.videoHeight })
        setReady(true)
      }
      if (isFinite(v.duration) && v.duration > 0) {
        finish(v.duration)
      } else {
        const once = () => {
          v.removeEventListener('seeked', once)
          finish(v.duration)
        }
        v.addEventListener('seeked', once)
        v.currentTime = 1e7
      }
    }
    if (v.readyState >= 1) ready()
    else v.addEventListener('loadedmetadata', ready, { once: true })

    return () => {
      cancelled = true
      v.removeEventListener('seeked', onSeeked)
    }
  }, [])

  // redesenha ao mudar recorte / moldura / background / encaixe / seção
  useEffect(() => {
    drawRef.current()
  }, [crop, cropMode, frameId, background, bgTransparent, screenFill, fit, open])

  useEffect(() => {
    trimRef.current = { start: trimStart, end: trimEnd }
  }, [trimStart, trimEnd])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed, playing, ready])

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

  // --- navegação entre seções ---
  function toggle(s: Section) {
    setOpen((cur) => (cur === s ? null : s))
  }
  function advance(to: Section) {
    setCropMode(false)
    setMaxUnlocked((m) => Math.max(m, ORDER.indexOf(to)))
    setOpen(to)
  }

  // --- exportação (baixar / copiar) ---
  async function runExport() {
    const opts = {
      start: trimStart,
      end: trimEnd,
      crop: crop ?? undefined,
      scene,
      speed,
    }
    const onProgress = (p: number) =>
      setExportState((s) => (s.kind === 'download' ? { ...s, progress: p } : s))
    return format === 'mp4'
      ? webmToMp4(blob, duration, { ...opts, onProgress })
      : webmToGif(blob, duration, { ...opts, onProgress, fps, scale, dither })
  }

  async function handleDownload() {
    setExportState({ kind: 'download', progress: 0 })
    try {
      const out = await runExport()
      download(out, format === 'mp4' ? 'gravacao.mp4' : 'gravacao.gif')
    } finally {
      setExportState({ kind: 'idle' })
    }
  }

  // dimensões e tamanho estimado da saída GIF
  function gifEstimate() {
    if (!dims) return null
    const vw = dims.w
    const vh = dims.h
    const srcW = crop ? crop.w * vw : vw
    const srcH = crop ? crop.h * vh : vh
    const { width, height } = composedSize(scene, srcW, srcH)
    const ow = Math.max(1, Math.round(width * scale))
    const oh = Math.max(1, Math.round(height * scale))
    const span = Math.max(0, (trimEnd - trimStart) / speed)
    const frames = Math.max(1, Math.round(span * fps))
    const mb = (frames * ow * oh * 0.18) / 1e6
    return { ow, oh, frames, mb }
  }

  const est = format === 'gif' ? gifEstimate() : null
  const showEstimate = (open === 'format' || open === 'export') && est

  const overlayText =
    exportState.kind === 'download'
      ? `${Math.round(exportState.progress * 100)}% Baixando...`
      : null

  return (
    <div className="app">
      <video ref={videoRef} src={previewUrl} muted playsInline className="source" />

      {/* bloco de gravação */}
      <section className="recorder">
        <div
          className={`stage${cropMode || busy ? '' : ' clickable'}${
            bgTransparent ? ' checker' : ''
          }`}
          onClick={() => {
            if (!cropMode && !busy) setPlaying((p) => !p)
          }}
        >
          <canvas ref={canvasRef} className="preview" />
          {!playing && !cropMode && !overlayText && <div className="play-overlay">▶</div>}
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
              >
                <span className="handle nw" />
                <span className="handle ne" />
                <span className="handle sw" />
                <span className="handle se" />
              </div>
            )}
          </div>
          {overlayText && <div className="stage__overlay">{overlayText}</div>}
        </div>

        {open === 'edit' && (
          <DualRange
            min={0}
            max={duration}
            start={trimStart}
            end={trimEnd}
            onStart={changeStart}
            onEnd={changeEnd}
            current={playing ? null : playhead}
            onSeek={(t) => {
              setPlaying(false)
              setPlayhead(t)
              seek(t)
            }}
          />
        )}

        {showEstimate && (
          <p className="estimate">
            {est!.ow}×{est!.oh}px · {est!.frames} frames · ~{est!.mb.toFixed(1)} MB
            (estimativa)
          </p>
        )}

        <Footer />
      </section>

      {/* bloco de edição */}
      <aside className="panel">
        <div className="panel__content">
          {/* Editar */}
          <Accordion title="Editar" open={open === 'edit'} onToggle={() => toggle('edit')}>
            <div className="actions">
              <button
                className="btn"
                aria-pressed={cropMode}
                onClick={() => setCropMode((m) => !m)}
              >
                {cropMode ? 'Concluir recorte' : 'Recortar'}
              </button>
              <button className="btn" onClick={() => setCrop(null)} disabled={!crop}>
                Limpar corte
              </button>
            </div>
          </Accordion>

          {/* Formatar */}
          <Accordion
            title="Formatar"
            open={open === 'format'}
            onToggle={() => toggle('format')}
          >
            <fieldset className="section-body" disabled={!unlocked('format')}>
              <select
                className="field field--select"
                value={frameId}
                onChange={(e) => setFrameId(e.target.value)}
              >
                <option value="none">Moldura</option>
                {FRAMES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>

              <div className="segment">
                <button
                  className={`segment__item${fit === 'fit' ? ' segment__item--active' : ''}`}
                  onClick={() => setFit('fit')}
                >
                  Fit
                </button>
                <button
                  className={`segment__item${fit === 'fill' ? ' segment__item--active' : ''}`}
                  onClick={() => setFit('fill')}
                >
                  Fill
                </button>
              </div>

              <div className="field field--color">
                <span>
                  Cor de fundo{' '}
                  {bgTransparent && <span className="muted">– Transparente</span>}
                </span>
                <ColorPicker
                  value={background}
                  transparent={bgTransparent}
                  onChange={(h) => {
                    setBackground(h)
                    setBgTransparent(false)
                  }}
                  onTransparent={() => setBgTransparent(true)}
                />
              </div>

              {frame && (
                <div className="field field--color">
                  <span>Cor da tela</span>
                  <ColorPicker value={screenFill} onChange={setScreenFill} />
                </div>
              )}
            </fieldset>
          </Accordion>

          {/* Exportar */}
          <Accordion
            title="Exportar"
            open={open === 'export'}
            onToggle={() => toggle('export')}
          >
            <fieldset className="section-body" disabled={!unlocked('export') || busy}>
              <div className="segment">
                <button
                  className={`segment__item${format === 'gif' ? ' segment__item--active' : ''}`}
                  onClick={() => setFormat('gif')}
                >
                  GIF
                </button>
                <button
                  className={`segment__item${format === 'mp4' ? ' segment__item--active' : ''}`}
                  onClick={() => setFormat('mp4')}
                >
                  MP4
                </button>
              </div>
              <div className="row">
                <select
                  className="field field--select"
                  value={speed}
                  onChange={(e) => setSpeed(+e.target.value)}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
                <select
                  className="field field--select"
                  value={fps}
                  onChange={(e) => setFps(+e.target.value)}
                  disabled={format !== 'gif'}
                >
                  <option value={10}>10 FPS</option>
                  <option value={15}>15 FPS</option>
                  <option value={20}>20 FPS</option>
                  <option value={24}>24 FPS</option>
                </select>
                <select
                  className="field field--select field--res"
                  value={scale}
                  onChange={(e) => setScale(+e.target.value)}
                  disabled={format !== 'gif'}
                >
                  <option value={1}>100%</option>
                  <option value={0.75}>75%</option>
                  <option value={0.5}>50%</option>
                </select>
              </div>
            </fieldset>
          </Accordion>
        </div>

        {/* ações inferiores, conforme a seção aberta */}
        <div className="panel__actions">
          <button className="btn" onClick={onReset} disabled={busy}>
            Nova gravação
          </button>

          {open === 'edit' && (
            <button className="btn" onClick={() => advance('format')}>
              Próximo: formatar
            </button>
          )}
          {open === 'format' && (
            <button
              className="btn"
              onClick={() => advance('export')}
              disabled={!unlocked('format')}
            >
              Próximo: exportar
            </button>
          )}
          {open === 'export' && (
            <button
              className="btn"
              onClick={handleDownload}
              disabled={!unlocked('export') || busy}
            >
              Baixar
            </button>
          )}
        </div>
      </aside>
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
