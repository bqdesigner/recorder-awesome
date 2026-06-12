import { describe, it, expect } from 'vitest'
import { quantizeRGB } from './quantizeRGB'

/** Buffer RGBA com as cores dadas, uma vez cada (ou `times` vezes). */
function rgbaOf(colors: number[][], times = 1): Uint8ClampedArray {
  const out = new Uint8ClampedArray(colors.length * times * 4)
  let o = 0
  for (const [r, g, b] of colors) {
    for (let t = 0; t < times; t++) {
      out[o] = r
      out[o + 1] = g
      out[o + 2] = b
      out[o + 3] = 255
      o += 4
    }
  }
  return out
}

describe('quantizeRGB', () => {
  it('conteúdo com ≤ maxColors cores únicas → paleta exata (sem perda)', () => {
    const colors = [
      [25, 25, 25],
      [32, 32, 32], // cinzas escuros próximos: rgb565 fundiria
      [255, 255, 255],
      [220, 38, 38],
    ]
    const pal = quantizeRGB(rgbaOf(colors, 10), 255)
    expect(pal.length).toBe(4)
    for (const c of colors) {
      expect(pal).toContainEqual(c)
    }
  })

  it('preserva cinzas escuros distintos de UI dark', () => {
    // os tons do tema dark do Notion que a paleta global colapsava
    const colors = [
      [25, 25, 25],
      [32, 32, 32],
      [37, 37, 37],
      [43, 43, 43],
      [55, 55, 55],
    ]
    const pal = quantizeRGB(rgbaOf(colors, 100), 255)
    expect(pal.length).toBe(5)
    expect(pal).toContainEqual([25, 25, 25])
    expect(pal).toContainEqual([32, 32, 32])
  })

  it('mais cores que o teto → reduz para ≤ maxColors', () => {
    const colors: number[][] = []
    for (let i = 0; i < 600; i++) colors.push([i % 256, (i * 7) % 256, (i * 13) % 256])
    const pal = quantizeRGB(rgbaOf(colors), 255)
    expect(pal.length).toBeLessThanOrEqual(255)
    expect(pal.length).toBeGreaterThan(200) // median cut deve usar o orçamento
  })

  it('cor dominante não é puxada por cor rara distante', () => {
    // 1000 pixels de cinza escuro + 1 pixel vermelho: o cluster escuro não
    // pode "tingir" (era o sintoma com rgb565)
    const data = rgbaOf([[30, 30, 30]], 1000)
    const rare = rgbaOf([[255, 0, 0]], 1)
    const merged = new Uint8ClampedArray(data.length + rare.length)
    merged.set(data)
    merged.set(rare, data.length)
    const pal = quantizeRGB(merged, 255)
    expect(pal).toContainEqual([30, 30, 30])
    expect(pal).toContainEqual([255, 0, 0])
  })

  it('é determinístico', () => {
    const colors: number[][] = []
    for (let i = 0; i < 600; i++) colors.push([(i * 3) % 256, (i * 5) % 256, (i * 11) % 256])
    const a = quantizeRGB(rgbaOf(colors), 64)
    const b = quantizeRGB(rgbaOf(colors), 64)
    expect(a).toEqual(b)
  })
})
