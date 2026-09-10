import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  webmToGif,
  webmToMp4,
  MP4_MAX_DIMENSION,
  MP4_FPS,
  mp4OutputSize,
  mp4Bitrate,
  compose,
  composedSize,
  autoScale,
  FRAMES,
  type Crop,
  type Scene,
  type Fit,
} from '../engine'
import { exportFilename, formatClock } from '../format'
import TopBar from './TopBar'
import ColorPicker from './ColorPicker'
import DualRange from './DualRange'
import Segmented from './Segmented'
import Switch from './Switch'
import {
  PlayIcon,
  PauseIcon,
  ScissorsIcon,
  CheckIcon,
  TrashIcon,
  DownloadIcon,
  RefreshIcon,
  FrameIcon,
} from './icons'
import './Editor.css'

interface Props {
  blob: Blob
  /** Duração estimada da gravação (s). */
  duration: number
  previewUrl: string
  onReset: () => void
}

const MIN_CROP = 0.02 // recortes menores que isso = limpar

// Bytes por pixel/frame pra estimar o peso do GIF. Calibrado contra exports
// reais do pipeline delta (estático vira transparente → comprime muito): uma
// gravação que dava ~40 MB na heurística antiga (0,18) baixava em ~5 MB no
// arquivo final. Leve margem acima do medido (~0,0225) pra não subestimar
// gravações com mais movimento. Aproximação — varia com a quantidade de mudança.
const GIF_BYTES_PER_PX = 0.025

type Corner = 'nw' | 'ne' | 'sw' | 'se'
type Drag =
  | { mode: 'new'; ox: number; oy: number } // âncora = ponto inicial
  | { mode: 'resize'; ox: number; oy: number } // âncora = canto oposto
  | { mode: 'move'; dx: number; dy: number } // offset do ponteiro até o canto sup-esq

type ExportState = { kind: 'idle' } | { kind: 'download'; progress: number }

const FRAME_OPTIONS = [{ id: 'none', label: 'Nenhuma' }, ...FRAMES.map((f) => ({ id: f.id, label: f.label }))]

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
  const [addRespiro, setAddRespiro] = useState(false)
  const [background, setBackground] = useState('#1e1e1e')
  const [bgTransparent, setBgTransparent] = useState(false)
  const [screenFill, setScreenFill] = useState('#000000')
  const [fit, setFit] = useState<Fit>('fit')
  const [format, setFormat] = useState<'gif' | 'mp4'>('gif')
  const [speed, setSpeed] = useState(1)
  const [fps, setFps] = useState(15)
  const [scale, setScale] = useState<number | 'auto'>('auto')
  const [playing, setPlaying] = useState(true)
  const [playhead, setPlayhead] = useState(0)
  const [ready, setReady] = useState(false)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  const [exportState, setExportState] = useState<ExportState>({ kind: 'idle' })
  const [exportError, setExportError] = useState<string | null>(null)

  const trimRef = useRef({ start: 0, end: estDuration })
  // guarda se a reprodução estava rolando ao iniciar o scrub, pra retomar no release
  const wasPlaying = useRef(false)
  // dithering ordenado (Bayer): quebra o banding em gradientes (qualidade
  // próxima do gifcap), mas com limiar fixo por posição → determinístico e
  // estável entre frames, sem o flicker do Floyd–Steinberg.
  const dither = 'ordered' as const

  const busy = exportState.kind === 'download'

  const frame = frameId === 'none' ? null : FRAMES.find((f) => f.id === frameId) ?? null
  const scene: Scene = {
    frame,
    // sem respiro o fundo é transparente (vãos de devices/cantos não se misturam
    // com a moldura escura); no export MP4 vira branco, pois MP4 não tem alpha.
    background: addRespiro ? (bgTransparent ? 'transparent' : background) : 'transparent',
    fit,
    padding: addRespiro ? 48 : 0,
    screenFill,
  }

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
    compose(c, v, src, scene)
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

  // redesenha ao mudar recorte / moldura / background / encaixe
  useEffect(() => {
    drawRef.current()
  }, [crop, cropMode, frameId, addRespiro, background, bgTransparent, screenFill, fit])

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
      // ao bater no fim real do arquivo o browser pausa ('ended') e um seek não
      // retoma sozinho: religa a reprodução pra manter o loop
      if (v.paused) v.play().catch(() => {})
      drawRef.current()
      setPlayhead(v.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, ready])

  // barra de espaço alterna play/pause quando o foco não está num controle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || cropMode || busy) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, select, textarea, button, a, [contenteditable]')) return
      e.preventDefault()
      setPlaying((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cropMode, busy])

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

  // Resolve a escala efetiva: 'auto' → fator que limita a maior dimensão da
  // saída ao teto do formato; número → ele mesmo. Usado no export e na
  // estimativa pra que o número exibido reflita a resolução realmente gerada.
  const resolveScale = (w: number, h: number, maxDim?: number) =>
    scale === 'auto' ? autoScale(w, h, maxDim) : scale

  // Cena composta no tamanho de origem (moldura/respiro entram na conta, não só
  // o vídeo recortado) + escala já resolvida contra o teto do formato. Base
  // comum do export e das estimativas: o número exibido tem que sair da mesma
  // conta que gera o arquivo.
  function outputPlan(exportScene: Scene, maxDim?: number) {
    if (!dims) return null
    const srcW = crop ? crop.w * dims.w : dims.w
    const srcH = crop ? crop.h * dims.h : dims.h
    const { width, height } = composedSize(exportScene, srcW, srcH)
    return { width, height, scale: resolveScale(width, height, maxDim) }
  }

  const outputScale = (exportScene: Scene, maxDim?: number) =>
    outputPlan(exportScene, maxDim)?.scale ?? (typeof scale === 'number' ? scale : 1)

  // --- exportação ---
  async function runExport() {
    // MP4 não suporta transparência: fundo transparente vira branco no vídeo.
    const exportScene: Scene =
      format === 'mp4' && scene.background === 'transparent'
        ? { ...scene, background: '#ffffff' }
        : scene
    const opts = {
      start: trimStart,
      end: trimEnd,
      crop: crop ?? undefined,
      scene: exportScene,
      speed,
    }
    const onProgress = (p: number) =>
      setExportState((s) => (s.kind === 'download' ? { ...s, progress: p } : s))
    if (format === 'mp4') {
      const outScale = outputScale(exportScene, MP4_MAX_DIMENSION)
      return webmToMp4(blob, duration, { ...opts, onProgress, scale: outScale })
    }

    return webmToGif(blob, duration, {
      ...opts,
      onProgress,
      fps,
      scale: outputScale(exportScene),
      dither,
    })
  }

  async function handleDownload() {
    setCropMode(false)
    setExportState({ kind: 'download', progress: 0 })
    setExportError(null)
    try {
      const out = await runExport()
      download(out, exportFilename(format === 'mp4' ? 'mp4' : 'gif'))
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Falha ao exportar')
    } finally {
      setExportState({ kind: 'idle' })
    }
  }

  /** Duração do arquivo gerado (s): trecho do trim já ajustado pela velocidade. */
  const outSpan = Math.max(0, (trimEnd - trimStart) / speed)

  // dimensões e tamanho estimado da saída GIF
  function gifEstimate() {
    const plan = outputPlan(scene)
    if (!plan) return null
    const ow = Math.max(1, Math.round(plan.width * plan.scale))
    const oh = Math.max(1, Math.round(plan.height * plan.scale))
    const frames = Math.max(1, Math.round(outSpan * fps))
    const mb = (frames * ow * oh * GIF_BYTES_PER_PX) / 1e6
    return { ow, oh, frames, mb }
  }

  // Idem pro MP4, mas o peso sai do bitrate alvo do encoder (bits/s × duração)
  // em vez de uma heurística por pixel: aqui quem manda no tamanho é o bitrate.
  function mp4Estimate() {
    const plan = outputPlan(scene, MP4_MAX_DIMENSION)
    if (!plan) return null
    const { width: ow, height: oh } = mp4OutputSize(plan.width, plan.height, plan.scale)
    const frames = Math.max(1, Math.round(outSpan * MP4_FPS))
    const mb = (mp4Bitrate(ow, oh) * outSpan) / 8 / 1e6
    return { ow, oh, frames, mb }
  }

  const est = format === 'gif' ? gifEstimate() : mp4Estimate()
  const progressPct = exportState.kind === 'download' ? Math.round(exportState.progress * 100) : 0

  return (
    <div className="app">
      <video ref={videoRef} src={previewUrl} muted playsInline className="source" />

      <TopBar>
        <button type="button" className="btn" onClick={onReset} disabled={busy}>
          <RefreshIcon />
          <span className="btn__label">Nova gravação</span>
        </button>
      </TopBar>

      <div className="editor">
        {/* palco: preview + transporte */}
        <section className="stage-col">
          <div className="stage-wrap">
            <div
              className={`stage${cropMode || busy ? '' : ' clickable'}${
                scene.background === 'transparent' && !cropMode ? ' checker' : ''
              }`}
              onClick={() => {
                if (!cropMode && !busy) setPlaying((p) => !p)
              }}
            >
              <canvas ref={canvasRef} className="preview" />
              {!playing && !cropMode && !busy && (
                <div className="play-overlay">
                  <span className="play-overlay__badge">
                    <PlayIcon />
                  </span>
                </div>
              )}
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
              {busy && (
                <div className="stage__overlay" role="status">
                  <span className="spinner" aria-hidden />
                  <span>Exportando {format.toUpperCase()} · {progressPct}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="transport">
            <div className="transport__row">
              <button
                type="button"
                className="btn btn--icon"
                aria-label={playing ? 'Pausar' : 'Reproduzir'}
                title={playing ? 'Pausar (espaço)' : 'Reproduzir (espaço)'}
                onClick={() => setPlaying((p) => !p)}
                disabled={cropMode || busy}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>

              <span className="clock" aria-live="off">
                {formatClock(playhead)}
                <span className="clock__sep">/</span>
                <span className="clock__total">{formatClock(trimEnd - trimStart)}</span>
              </span>

              <div className="transport__timeline">
                <DualRange
                  min={0}
                  max={duration}
                  start={trimStart}
                  end={trimEnd}
                  onStart={changeStart}
                  onEnd={changeEnd}
                  current={playhead}
                  onScrubStart={() => {
                    wasPlaying.current = playing
                    setPlaying(false)
                  }}
                  onScrubEnd={() => {
                    if (wasPlaying.current) setPlaying(true)
                  }}
                  onSeek={(t) => {
                    setPlayhead(t)
                    seek(t)
                  }}
                />
              </div>

              <div className="crop-tools">
                {!cropMode ? (
                  <button
                    type="button"
                    className={`btn${crop ? ' is-marked' : ''}`}
                    title="Recortar área"
                    onClick={() => {
                      setPlaying(false)
                      setCropMode(true)
                    }}
                    disabled={busy}
                  >
                    <ScissorsIcon />
                    <span className="btn__label">Recortar</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      title="Limpar corte"
                      onClick={() => {
                        setCrop(null)
                        setCropMode(false)
                      }}
                    >
                      <TrashIcon />
                      <span className="btn__label">Limpar</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      title="Concluir corte"
                      onClick={() => setCropMode(false)}
                    >
                      <CheckIcon />
                      <span className="btn__label">Concluir</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="transport__hint">
              {cropMode
                ? 'Arraste sobre o vídeo para escolher a área. Puxe os cantos para ajustar ou mova a seleção.'
                : 'Arraste as alças brancas para cortar início e fim. Clique na linha do tempo para navegar.'}
            </p>
          </div>
        </section>

        {/* inspector: formatar + exportar */}
        <aside className="inspector">
          <div className="inspector__scroll">
            <section className="group">
              <h2 className="group__title">Formatar</h2>

              <Field label="Moldura">
                <div className="frame-grid" role="radiogroup" aria-label="Moldura">
                  {FRAME_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={frameId === o.id}
                      className={`frame-opt${frameId === o.id ? ' is-active' : ''}`}
                      onClick={() => setFrameId(o.id)}
                    >
                      <FrameIcon id={o.id} />
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Encaixe" hint="Como o vídeo ocupa a tela da moldura">
                <Segmented
                  ariaLabel="Encaixe"
                  value={fit}
                  onChange={setFit}
                  options={[
                    { value: 'fit', label: 'Fit', title: 'Mostra o vídeo inteiro' },
                    { value: 'fill', label: 'Fill', title: 'Preenche a tela, pode cortar bordas' },
                  ]}
                />
              </Field>

              {frame && (
                <Field
                  label="Cor da tela"
                  hint={fit === 'fill' ? 'Sem efeito no Fill' : 'Aparece nas sobras do Fit'}
                  inline
                >
                  <ColorPicker value={screenFill} disabled={fit === 'fill'} onChange={setScreenFill} />
                </Field>
              )}

              <Field label="Respiro" hint="Margem em volta da gravação" inline>
                <Switch ariaLabel="Adicionar respiro" checked={addRespiro} onChange={setAddRespiro} />
              </Field>

              <Field
                label="Cor de fundo"
                hint={addRespiro ? undefined : 'Ative o respiro para usar'}
                inline
                disabled={!addRespiro}
              >
                <ColorPicker
                  value={background}
                  transparent={addRespiro ? bgTransparent : true}
                  disabled={!addRespiro}
                  onChange={(h) => {
                    setBackground(h)
                    setBgTransparent(false)
                  }}
                  onTransparent={() => setBgTransparent(true)}
                />
              </Field>
            </section>

            <section className="group">
              <h2 className="group__title">Exportar</h2>

              <Segmented
                ariaLabel="Formato"
                size="lg"
                value={format}
                onChange={setFormat}
                disabled={busy}
                options={[
                  {
                    value: 'gif',
                    label: (
                      <>
                        <strong>GIF</strong>
                        <small>Loop · chat e docs</small>
                      </>
                    ),
                  },
                  {
                    value: 'mp4',
                    label: (
                      <>
                        <strong>MP4</strong>
                        <small>Vídeo · mais nítido</small>
                      </>
                    ),
                  },
                ]}
              />

              <Field label="Velocidade">
                <Segmented
                  ariaLabel="Velocidade"
                  value={speed}
                  onChange={setSpeed}
                  disabled={busy}
                  options={[
                    { value: 0.5, label: '0.5×' },
                    { value: 1, label: '1×' },
                    { value: 1.5, label: '1.5×' },
                    { value: 2, label: '2×' },
                  ]}
                />
              </Field>

              <Field
                label="Quadros por segundo"
                hint={format === 'mp4' ? `MP4 sai fixo em ${MP4_FPS} fps` : 'Mais fps = mais fluido e mais pesado'}
                disabled={format !== 'gif'}
              >
                <Segmented
                  ariaLabel="Quadros por segundo"
                  value={fps}
                  onChange={setFps}
                  disabled={format !== 'gif' || busy}
                  options={[
                    { value: 10, label: '10' },
                    { value: 15, label: '15' },
                    { value: 20, label: '20' },
                    { value: 24, label: '24' },
                  ]}
                />
              </Field>

              <Field label="Resolução" hint="Auto limita ao teto do formato">
                <Segmented
                  ariaLabel="Resolução"
                  value={scale}
                  onChange={setScale}
                  disabled={busy}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 1, label: '100%', title: 'Alta qualidade' },
                    { value: 0.5, label: '50%', title: 'Mais leve' },
                  ]}
                />
              </Field>
            </section>
          </div>

          <div className="inspector__footer">
            {est && (
              <p className="estimate">
                <span>
                  {est.ow}×{est.oh}px
                </span>
                <span className="estimate__dot">·</span>
                <span>{est.frames} quadros</span>
                <span className="estimate__dot">·</span>
                <span>~{est.mb.toFixed(1)} MB</span>
                <span className="estimate__note">estimativa</span>
              </p>
            )}
            {exportError && (
              <p className="export-error" role="alert">
                {exportError}
              </p>
            )}
            <button
              type="button"
              className="btn btn--primary btn--block download-btn"
              onClick={handleDownload}
              disabled={busy || !ready}
            >
              {busy && <span className="download-btn__bar" style={{ width: `${progressPct}%` }} />}
              <span className="download-btn__label">
                <DownloadIcon />
                {busy ? `Exportando ${progressPct}%` : `Baixar ${format.toUpperCase()}`}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  hint?: string
  /** Rótulo e controle na mesma linha (controles compactos: switch, cor). */
  inline?: boolean
  disabled?: boolean
  children: ReactNode
}

function Field({ label, hint, inline, disabled, children }: FieldProps) {
  return (
    <div className={`field${inline ? ' field--inline' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="field__label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="field__control">{children}</div>
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
