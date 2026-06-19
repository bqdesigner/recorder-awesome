import { describe, it, expect } from 'vitest'
import { halvingSteps, unsharpMask } from './sharpen'

describe('halvingSteps', () => {
  it('redução pequena (≤2×) é um passo só, direto no alvo', () => {
    expect(halvingSteps(1920, 1080, 1280, 720)).toEqual([{ w: 1280, h: 720 }])
  })

  it('sem downscale (alvo ≥ origem) devolve um passo (cópia 1:1)', () => {
    expect(halvingSteps(800, 600, 800, 600)).toEqual([{ w: 800, h: 600 }])
  })

  it('reduções grandes saltam em ~2× até cair no alvo', () => {
    // 4K → 1280: 3840 > 2560 → 1920; 1920 não > 2560 → para; último = alvo
    expect(halvingSteps(3840, 2160, 1280, 720)).toEqual([
      { w: 1920, h: 1080 },
      { w: 1280, h: 720 },
    ])
  })

  it('todo passo no máximo halva o anterior e o último é o alvo', () => {
    const steps = halvingSteps(8000, 6000, 500, 375)
    expect(steps[steps.length - 1]).toEqual({ w: 500, h: 375 })
    let prevW = 8000
    for (const s of steps) {
      expect(s.w).toBeGreaterThanOrEqual(prevW / 2 - 1)
      prevW = s.w
    }
  })
})

/** Imagem RGBA cinza com uma borda vertical (degrau) no meio. */
function edgeImage(w: number, h: number, left: number, right: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      const v = x < w / 2 ? left : right
      rgba[o] = rgba[o + 1] = rgba[o + 2] = v
      rgba[o + 3] = 255
    }
  }
  return rgba
}

/** Soma do |gradiente horizontal| no canal R — proxy de "energia de borda". */
function edgeEnergy(rgba: Uint8ClampedArray, w: number, h: number): number {
  let e = 0
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w; x++) {
      e += Math.abs(rgba[(y * w + x) * 4] - rgba[(y * w + x - 1) * 4])
    }
  }
  return e
}

describe('unsharpMask', () => {
  it('região chapada fica inalterada (sem sujar áreas lisas)', () => {
    const w = 8, h = 8
    const flat = new Uint8ClampedArray(w * h * 4).fill(40)
    for (let p = 3; p < flat.length; p += 4) flat[p] = 255
    const before = Uint8ClampedArray.from(flat)
    unsharpMask(flat, w, h, 0.6)
    expect(flat).toEqual(before)
  })

  it('aumenta a energia de borda num degrau (mais nítido)', () => {
    const w = 16, h = 16
    const img = edgeImage(w, h, 80, 160)
    const base = edgeEnergy(img, w, h)
    unsharpMask(img, w, h, 0.6)
    expect(edgeEnergy(img, w, h)).toBeGreaterThan(base)
  })

  it('preserva o canal alpha', () => {
    const w = 8, h = 8
    const img = edgeImage(w, h, 30, 200)
    for (let p = 3; p < img.length; p += 4) img[p] = 123
    unsharpMask(img, w, h, 0.6)
    for (let p = 3; p < img.length; p += 4) expect(img[p]).toBe(123)
  })

  it('mantém os valores no range 0..255 (clamp)', () => {
    const w = 8, h = 8
    const img = edgeImage(w, h, 0, 255)
    unsharpMask(img, w, h, 2) // amount alto força overshoot
    for (let i = 0; i < img.length; i++) {
      expect(img[i]).toBeGreaterThanOrEqual(0)
      expect(img[i]).toBeLessThanOrEqual(255)
    }
  })

  it('amount ≤ 0 ou imagem mínima não altera nada', () => {
    const w = 8, h = 8
    const img = edgeImage(w, h, 30, 200)
    const before = Uint8ClampedArray.from(img)
    unsharpMask(img, w, h, 0)
    expect(img).toEqual(before)
  })
})
