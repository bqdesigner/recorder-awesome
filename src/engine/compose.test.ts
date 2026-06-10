import { describe, it, expect } from 'vitest'
import { composedSize, type Scene } from './compose'
import { FRAMES } from './frames'

const base: Omit<Scene, 'frame'> = {
  background: '#000',
  fit: 'fit',
  padding: 0,
}

describe('composedSize', () => {
  it('sem moldura, sem padding = tamanho da fonte', () => {
    const { width, height, layout } = composedSize({ ...base, frame: null }, 640, 480)
    expect(width).toBe(640)
    expect(height).toBe(480)
    expect(layout.screen).toEqual({ x: 0, y: 0, w: 640, h: 480, radius: 0 })
  })

  it('padding soma 2x em cada eixo', () => {
    const { width, height } = composedSize({ ...base, frame: null, padding: 20 }, 640, 480)
    expect(width).toBe(680)
    expect(height).toBe(520)
  })
})

describe('FRAMES', () => {
  const byId = (id: string) => FRAMES.find((f) => f.id === id)!

  it('borda preta adiciona espessura uniforme (t=12) ao redor', () => {
    const l = byId('border-black').layout(640, 480)
    expect(l.width).toBe(640 + 24)
    expect(l.height).toBe(480 + 24)
    expect(l.screen).toMatchObject({ x: 12, y: 12, w: 640, h: 480 })
  })

  it('celular limita a largura da tela entre 360 e 400', () => {
    expect(byId('phone').layout(100, 0).screen.w).toBe(360)
    expect(byId('phone').layout(1000, 0).screen.w).toBe(400)
    expect(byId('phone').layout(380, 0).screen.w).toBe(380)
  })
})
