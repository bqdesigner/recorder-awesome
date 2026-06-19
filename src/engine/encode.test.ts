import { describe, it, expect } from 'vitest'
import {
  sampleFrameIndices,
  subsampleRGBA,
  bayerOffset,
  applyPaletteOrdered,
  applyPaletteAlphaOrdered,
  hasRealAlpha,
  opaquePixels,
  diffMask,
  collectChangedRGBA,
  applyPaletteOrderedMasked,
  autoScale,
  DEFAULT_MAX_DIMENSION,
  DELTA_THRESHOLD,
  NEAR_SNAP_DIST2,
} from './encode'

/** Preenche um buffer RGBA w×h com uma cor sólida. */
function solidRGBA(w: number, h: number, r: number, g: number, b: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    rgba[p * 4] = r
    rgba[p * 4 + 1] = g
    rgba[p * 4 + 2] = b
    rgba[p * 4 + 3] = 255
  }
  return rgba
}

describe('applyPaletteOrdered — near-hit snapping (fundo chapado limpo)', () => {
  it('cor que encosta na paleta mapeia igual em toda posição (sem grão de dither)', () => {
    // (24,23,22) → dist² a [20,20,20] = 16+9+4 = 29 ≤ NEAR_SNAP_DIST2 → snap
    expect(29).toBeLessThanOrEqual(NEAR_SNAP_DIST2)
    const palette = [[20, 20, 20], [40, 40, 40]]
    const idx = applyPaletteOrdered(solidRGBA(8, 8, 24, 23, 22), palette, 8, 8)
    expect(new Set(idx)).toEqual(new Set([0])) // uniforme: zero grão
  })

  it('cor distante da paleta (gradiente real) ainda recebe dither (varia por posição)', () => {
    // (30,30,30) com paleta [0]/[60]: dist² = 2700 > NEAR_SNAP_DIST2 → dither
    expect(2700).toBeGreaterThan(NEAR_SNAP_DIST2)
    const palette = [[0, 0, 0], [60, 60, 60]]
    const idx = applyPaletteOrdered(solidRGBA(8, 8, 30, 30, 30), palette, 8, 8)
    expect(new Set(idx).size).toBe(2) // Bayer alterna entre as duas cores
  })

  it('acerto exato segue mapeando direto', () => {
    const palette = [[20, 20, 20], [40, 40, 40]]
    const idx = applyPaletteOrdered(solidRGBA(4, 4, 40, 40, 40), palette, 4, 4)
    expect(new Set(idx)).toEqual(new Set([1]))
  })
})

describe('sampleFrameIndices', () => {
  it('devolve todos os frames quando há menos que o teto', () => {
    expect(sampleFrameIndices(1, 24)).toEqual([0])
    expect(sampleFrameIndices(10, 24)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('inclui sempre primeiro e último frame', () => {
    const idx = sampleFrameIndices(120, 24)
    expect(idx[0]).toBe(0)
    expect(idx[idx.length - 1]).toBe(119)
    expect(idx.length).toBe(24)
  })

  it('distribui uniformemente', () => {
    expect(sampleFrameIndices(100, 5)).toEqual([0, 25, 50, 74, 99])
  })

  it('é robusto a frameCount ou maxSamples degenerados', () => {
    expect(sampleFrameIndices(0, 24)).toEqual([0])
    expect(sampleFrameIndices(50, 1)).toEqual([0])
  })
})

describe('autoScale', () => {
  it('não altera (1) quando a maior dimensão cabe no teto', () => {
    expect(autoScale(1280, 720)).toBe(1)
    expect(autoScale(800, 600)).toBe(1)
    expect(autoScale(1280, 1280)).toBe(1) // exatamente no teto
  })

  it('reduz pra limitar a maior dimensão ao teto', () => {
    expect(autoScale(2560, 1440)).toBe(0.5)
    expect(autoScale(1920, 1080)).toBeCloseTo(1280 / 1920, 10)
    expect(autoScale(720, 1600)).toBeCloseTo(1280 / 1600, 10) // retrato: usa altura
  })

  it('nunca amplia (teto em 1)', () => {
    expect(autoScale(100, 100)).toBeLessThanOrEqual(1)
    expect(autoScale(3000, 100)).toBeLessThanOrEqual(1)
  })

  it('respeita maxDim customizado', () => {
    expect(autoScale(2000, 1000, 1000)).toBe(0.5)
    expect(autoScale(500, 500, 1000)).toBe(1)
  })

  it('captura grande gera redução de área relevante (≥ ~55% mais leve a 1080p)', () => {
    // peso do GIF ~ proporcional à área (px por frame); área = (s)²
    const s = autoScale(1920, 1080)
    const areaRatio = s * s
    expect(areaRatio).toBeLessThan(0.45) // saída ≤ 45% da área original
  })

  it('DEFAULT_MAX_DIMENSION é o teto usado por padrão', () => {
    const s = autoScale(DEFAULT_MAX_DIMENSION * 2, 10)
    expect(s).toBe(0.5)
  })
})

/** Buffer RGBA de `n` pixels onde cada canal = índice do pixel. */
function ramp(n: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    out[i * 4] = i
    out[i * 4 + 1] = i
    out[i * 4 + 2] = i
    out[i * 4 + 3] = 255
  }
  return out
}

describe('subsampleRGBA', () => {
  it('stride <= 1 é no-op (mesmo buffer)', () => {
    const data = ramp(4)
    expect(subsampleRGBA(data, 1)).toBe(data)
    expect(subsampleRGBA(data, 0)).toBe(data)
  })

  it('stride 4 sobre 8 pixels retorna 2 pixels (0 e 4)', () => {
    const out = subsampleRGBA(ramp(8), 4)
    expect(out.length).toBe(2 * 4)
    expect(Array.from(out)).toEqual([0, 0, 0, 255, 4, 4, 4, 255])
  })

  it('conta ceil(pixels/stride) quando não é múltiplo exato', () => {
    const out = subsampleRGBA(ramp(10), 4) // ceil(10/4) = 3 → pixels 0,4,8
    expect(out.length).toBe(3 * 4)
    expect(Array.from(out.slice(8, 12))).toEqual([8, 8, 8, 255])
  })

  it('preserva os 4 canais dos pixels amostrados', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 40, 99, 99, 99, 99, 50, 60, 70, 80])
    const out = subsampleRGBA(data, 2)
    expect(Array.from(out)).toEqual([10, 20, 30, 40, 50, 60, 70, 80])
  })
})

describe('bayerOffset', () => {
  it('é determinístico: mesma posição → mesmo valor', () => {
    expect(bayerOffset(3, 5)).toBe(bayerOffset(3, 5))
  })

  it('fica no intervalo [-0.5, 0.5)', () => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const v = bayerOffset(x, y)
        expect(v).toBeGreaterThanOrEqual(-0.5)
        expect(v).toBeLessThan(0.5)
      }
    }
  })

  it('é periódico em 8 nos dois eixos', () => {
    expect(bayerOffset(2, 6)).toBe(bayerOffset(2 + 8, 6))
    expect(bayerOffset(2, 6)).toBe(bayerOffset(2, 6 + 16))
    expect(bayerOffset(0, 0)).toBe(bayerOffset(8, 8))
  })

  it('cobre o canto baixo (0) e o canto alto (63) da matriz', () => {
    expect(bayerOffset(0, 0)).toBeCloseTo(-0.5) // célula 0 (canto sup. esq.)
    expect(bayerOffset(0, 7)).toBeCloseTo(63 / 64 - 0.5) // célula 63 (início da última linha)
  })
})

/** Buffer RGBA de w*h pixels todos com a mesma cor (r,g,b), alpha 255. */
function solid(w: number, h: number, r: number, g: number, b: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = r
    out[i * 4 + 1] = g
    out[i * 4 + 2] = b
    out[i * 4 + 3] = 255
  }
  return out
}

describe('applyPaletteOrdered', () => {
  const bw = [
    [0, 0, 0],
    [255, 255, 255],
  ]

  it('estável no tempo: mesmo frame → índices idênticos (sem flicker)', () => {
    const frame = solid(8, 8, 130, 130, 130)
    const a = applyPaletteOrdered(frame, bw, 8, 8)
    const b = applyPaletteOrdered(frame, bw, 8, 8)
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('faz dithering: região cinza chapada usa as duas cores da paleta', () => {
    // cinza ~127 fica na fronteira preto/branco; o limiar Bayer empurra
    // alguns pixels pra cada lado → mistura (quebra o banding).
    const idx = applyPaletteOrdered(solid(8, 8, 127, 127, 127), bw, 8, 8)
    const uniq = new Set(idx)
    expect(uniq.has(0)).toBe(true)
    expect(uniq.has(1)).toBe(true)
  })

  it('cor exata da paleta não vira ruído visível além do dither', () => {
    // preto puro: o offset Bayer (máx ~+22) mantém quase tudo no preto.
    const idx = applyPaletteOrdered(solid(8, 8, 0, 0, 0), bw, 8, 8)
    const blacks = Array.from(idx).filter((v) => v === 0).length
    expect(blacks).toBe(64)
  })
})

describe('hasRealAlpha / opaquePixels', () => {
  it('buffer todo opaco → sem alpha real', () => {
    expect(hasRealAlpha(solid(4, 4, 10, 10, 10))).toBe(false)
  })

  it('um pixel transparente → alpha real', () => {
    const data = solid(4, 4, 10, 10, 10)
    data[3] = 0
    expect(hasRealAlpha(data)).toBe(true)
  })

  it('alpha alto (≥128) não conta como transparência', () => {
    const data = solid(2, 2, 10, 10, 10)
    data[3] = 200
    expect(hasRealAlpha(data)).toBe(false)
  })

  it('opaquePixels filtra os transparentes', () => {
    const data = new Uint8ClampedArray([1, 1, 1, 255, 2, 2, 2, 0, 3, 3, 3, 255])
    const out = opaquePixels(data)
    expect(Array.from(out)).toEqual([1, 1, 1, 255, 3, 3, 3, 255])
  })
})

describe('applyPaletteAlphaOrdered', () => {
  const bw = [
    [0, 0, 0],
    [255, 255, 255],
  ]
  const TRANS = 2

  it('pixel transparente vira transparentIndex; opaco é mapeado', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255, 9, 9, 9, 0])
    const idx = applyPaletteAlphaOrdered(data, bw, 2, 1, TRANS)
    expect(idx[0]).toBe(1)
    expect(idx[1]).toBe(TRANS)
  })

  it('cor exata da paleta não recebe dither', () => {
    const idx = applyPaletteAlphaOrdered(solid(8, 8, 0, 0, 0), bw, 8, 8, TRANS)
    expect(Array.from(new Set(idx))).toEqual([0])
  })
})

/** Shadow (3 bytes/px) preenchido a partir de um buffer RGBA. */
function shadowFrom(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const n = rgba.length / 4
  const out = new Uint8ClampedArray(n * 3)
  for (let p = 0; p < n; p++) {
    out[p * 3] = rgba[p * 4]
    out[p * 3 + 1] = rgba[p * 4 + 1]
    out[p * 3 + 2] = rgba[p * 4 + 2]
  }
  return out
}

describe('diffMask', () => {
  it('frame idêntico → nada marcado', () => {
    const frame = solid(8, 8, 250, 250, 250)
    const { mask, count } = diffMask(frame, shadowFrom(frame), DELTA_THRESHOLD)
    expect(count).toBe(0)
    expect(mask.every((v) => v === 0)).toBe(true)
  })

  it('ruído dentro do threshold é absorvido (anti-VP9)', () => {
    const prev = solid(8, 8, 100, 100, 100)
    const noisy = solid(8, 8, 100 + DELTA_THRESHOLD, 100 - DELTA_THRESHOLD, 100)
    const { count } = diffMask(noisy, shadowFrom(prev), DELTA_THRESHOLD)
    expect(count).toBe(0)
  })

  it('mudança acima do threshold marca o pixel', () => {
    const prev = solid(2, 1, 0, 0, 0)
    const next = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const { mask, count } = diffMask(next, shadowFrom(prev), DELTA_THRESHOLD)
    expect(count).toBe(1)
    expect(Array.from(mask)).toEqual([0, 1])
  })

  it('não altera o shadow', () => {
    const prev = solid(4, 1, 10, 10, 10)
    const shadow = shadowFrom(prev)
    diffMask(solid(4, 1, 200, 200, 200), shadow, DELTA_THRESHOLD)
    expect(shadow[0]).toBe(10)
  })
})

describe('collectChangedRGBA', () => {
  it('junta só os pixels marcados', () => {
    const rgba = new Uint8ClampedArray([1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255])
    const mask = new Uint8Array([1, 0, 1])
    const out = collectChangedRGBA(rgba, mask, 2, 1)
    expect(Array.from(out)).toEqual([1, 1, 1, 255, 3, 3, 3, 255])
  })

  it('stride amostra 1 a cada N pixels marcados', () => {
    const rgba = ramp(8)
    const mask = new Uint8Array(8).fill(1)
    const out = collectChangedRGBA(rgba, mask, 8, 4)
    expect(out.length).toBe(2 * 4) // pixels 0 e 4
    expect(out[4]).toBe(4)
  })
})

describe('applyPaletteOrderedMasked', () => {
  const bw = [
    [0, 0, 0],
    [255, 255, 255],
  ]
  const TRANS = 2 // índice transparente (fora da paleta bw)

  it('pixel fora da mask vira transparentIndex e o shadow não muda', () => {
    const frame = solid(8, 8, 250, 250, 250)
    const shadow = shadowFrom(solid(8, 8, 9, 9, 9))
    const mask = new Uint8Array(64) // nada marcado
    const idx = applyPaletteOrderedMasked(frame, bw, 8, 8, mask, TRANS, shadow)
    expect(Array.from(new Set(idx))).toEqual([TRANS])
    expect(shadow[0]).toBe(9)
  })

  it('pixel na mask é mapeado e atualiza o shadow', () => {
    const next = solid(8, 8, 255, 255, 255)
    const shadow = shadowFrom(solid(8, 8, 0, 0, 0))
    const mask = new Uint8Array(64).fill(1)
    const idx = applyPaletteOrderedMasked(next, bw, 8, 8, mask, TRANS, shadow)
    expect(Array.from(new Set(idx))).toEqual([1])
    expect(shadow[0]).toBe(255)
  })

  it('mistura: só os marcados são re-escritos', () => {
    const next = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const shadow = shadowFrom(solid(2, 1, 0, 0, 0))
    const mask = new Uint8Array([0, 1])
    const idx = applyPaletteOrderedMasked(next, bw, 2, 1, mask, TRANS, shadow)
    expect(idx[0]).toBe(TRANS)
    expect(idx[1]).toBe(1)
  })

  it('é determinístico para o mesmo estado', () => {
    const frame = solid(8, 8, 200, 60, 60)
    const mask = new Uint8Array(64).fill(1)
    const a = applyPaletteOrderedMasked(frame, bw, 8, 8, mask, TRANS, shadowFrom(solid(8, 8, 0, 0, 0)))
    const b = applyPaletteOrderedMasked(frame, bw, 8, 8, mask, TRANS, shadowFrom(solid(8, 8, 0, 0, 0)))
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})
