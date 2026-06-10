import { describe, it, expect } from 'vitest'
import { sampleFrameIndices, subsampleRGBA } from './encode'

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
