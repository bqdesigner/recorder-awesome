import { describe, it, expect } from 'vitest'
import {
  sampleFrameIndices,
  subsampleRGBA,
  bayerOffset,
  applyPaletteOrdered,
  applyPaletteOrderedDelta,
  DELTA_THRESHOLD,
} from './encode'

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

describe('applyPaletteOrderedDelta', () => {
  const bw = [
    [0, 0, 0],
    [255, 255, 255],
  ]
  const TRANS = 2 // índice transparente (fora da paleta bw)

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

  it('pixel inalterado vira transparentIndex e o shadow não muda', () => {
    const frame = solid(8, 8, 250, 250, 250)
    const shadow = shadowFrom(frame)
    const idx = applyPaletteOrderedDelta(frame, bw, 8, 8, shadow, DELTA_THRESHOLD, TRANS)
    expect(Array.from(new Set(idx))).toEqual([TRANS])
    expect(shadow[0]).toBe(250)
  })

  it('ruído dentro do threshold é absorvido (anti-VP9)', () => {
    const prev = solid(8, 8, 100, 100, 100)
    const shadow = shadowFrom(prev)
    const noisy = solid(8, 8, 100 + DELTA_THRESHOLD, 100 - DELTA_THRESHOLD, 100)
    const idx = applyPaletteOrderedDelta(noisy, bw, 8, 8, shadow, DELTA_THRESHOLD, TRANS)
    expect(Array.from(new Set(idx))).toEqual([TRANS])
    expect(shadow[0]).toBe(100) // shadow preserva a última escrita real
  })

  it('mudança acima do threshold é escrita e atualiza o shadow', () => {
    const prev = solid(8, 8, 0, 0, 0)
    const shadow = shadowFrom(prev)
    const next = solid(8, 8, 255, 255, 255)
    const idx = applyPaletteOrderedDelta(next, bw, 8, 8, shadow, DELTA_THRESHOLD, TRANS)
    expect(Array.from(new Set(idx))).toEqual([1]) // tudo mapeado pro branco
    expect(shadow[0]).toBe(255)
  })

  it('mistura: só os pixels alterados são re-escritos', () => {
    const prev = solid(2, 1, 0, 0, 0) // 2 pixels pretos
    const shadow = shadowFrom(prev)
    const next = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]) // 2º vira branco
    const idx = applyPaletteOrderedDelta(next, bw, 2, 1, shadow, DELTA_THRESHOLD, TRANS)
    expect(idx[0]).toBe(TRANS)
    expect(idx[1]).toBe(1)
  })

  it('é determinístico para o mesmo estado', () => {
    const frame = solid(8, 8, 200, 60, 60)
    const a = applyPaletteOrderedDelta(frame, bw, 8, 8, shadowFrom(solid(8, 8, 0, 0, 0)), DELTA_THRESHOLD, TRANS)
    const b = applyPaletteOrderedDelta(frame, bw, 8, 8, shadowFrom(solid(8, 8, 0, 0, 0)), DELTA_THRESHOLD, TRANS)
    expect(Array.from(a)).toEqual(Array.from(b))
  })
})
