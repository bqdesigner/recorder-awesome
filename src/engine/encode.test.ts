import { describe, it, expect } from 'vitest'
import { quantize, applyPalette } from 'gifenc'
import { subsampleRGBA } from './encode'

/** Cria um buffer RGBA de `n` pixels onde cada canal = índice do pixel. */
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
  it('stride <= 1 é no-op (retorna o mesmo buffer)', () => {
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
    // 10 pixels, stride 4 → ceil(10/4) = 3 pixels amostrados (0, 4, 8)
    const out = subsampleRGBA(ramp(10), 4)
    expect(out.length).toBe(3 * 4)
    expect(Array.from(out.slice(0, 4))).toEqual([0, 0, 0, 255])
    expect(Array.from(out.slice(8, 12))).toEqual([8, 8, 8, 255])
  })

  it('preserva os 4 canais dos pixels amostrados', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 40, 99, 99, 99, 99, 50, 60, 70, 80])
    const out = subsampleRGBA(data, 2)
    expect(out.length).toBe(2 * 4)
    expect(Array.from(out)).toEqual([10, 20, 30, 40, 50, 60, 70, 80])
  })
})

describe('subsampleRGBA + quantize (integração)', () => {
  it('palette do buffer amostrado é válida e usável por applyPalette', () => {
    // imagem 16x16 com poucas cores distintas
    const w = 16
    const h = 16
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      const c = (i % 3) * 100 // 3 cores: 0, 100, 200
      data[i * 4] = c
      data[i * 4 + 1] = c
      data[i * 4 + 2] = c
      data[i * 4 + 3] = 255
    }
    const palette = quantize(subsampleRGBA(data, 4), 256)
    expect(palette.length).toBeGreaterThan(0)
    expect(palette.length).toBeLessThanOrEqual(256)

    const index = applyPalette(data, palette)
    expect(index.length).toBe(w * h)
    for (const idx of index) {
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(palette.length)
    }
  })
})
