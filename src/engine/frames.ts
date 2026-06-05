/** Molduras genéricas (placeholders). Substituir pelo pack SVG depois. */

import type { Frame, FrameLayout } from './compose'

/** Borda simples: device = vídeo + espessura uniforme. */
function border(id: string, label: string, color: string): Frame {
  const t = 12
  const radius = 16
  return {
    id,
    label,
    layout(sw, sh) {
      return {
        width: sw + 2 * t,
        height: sh + 2 * t,
        screen: { x: t, y: t, w: sw, h: sh, radius },
      }
    },
    drawBody(ctx, l) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(0, 0, l.width, l.height, radius + t)
      ctx.fill()
    },
  }
}

/** Celular genérico (retrato). */
const phone: Frame = {
  id: 'phone',
  label: 'Celular',
  layout(srcW): FrameLayout {
    // largura da tela acompanha a gravação, limitada a 360–400px; altura fixa
    const SW = Math.round(Math.max(360, Math.min(srcW, 400)))
    const SH = 800
    const BEZEL = 12
    return {
      width: SW + 2 * BEZEL,
      height: SH + 2 * BEZEL,
      screen: { x: BEZEL, y: BEZEL, w: SW, h: SH, radius: 40 },
    }
  },
  drawBody(ctx, l) {
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.roundRect(0, 0, l.width, l.height, 52)
    ctx.fill()
    // tela apagada (fundo do letterbox)
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(l.screen.x, l.screen.y, l.screen.w, l.screen.h, l.screen.radius)
    ctx.fill()
  },
}

/** Notebook genérico (paisagem) com base. */
const laptop: Frame = {
  id: 'laptop',
  label: 'Notebook',
  layout(): FrameLayout {
    const SW = 1280
    const SH = 800
    const BEZEL = 14
    const BASE = 48
    return {
      width: SW + 2 * BEZEL,
      height: SH + 2 * BEZEL + BASE,
      screen: { x: BEZEL, y: BEZEL, w: SW, h: SH, radius: 6 },
    }
  },
  drawBody(ctx, l) {
    const blockH = l.screen.h + 2 * l.screen.y
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.roundRect(0, 0, l.width, blockH, 14)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(l.screen.x, l.screen.y, l.screen.w, l.screen.h, l.screen.radius)
    ctx.fill()
    // base
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.roundRect(l.width * 0.1, blockH, l.width * 0.8, 28, [0, 0, 10, 10])
    ctx.fill()
    // ressalto central
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(l.width * 0.43, blockH, l.width * 0.14, 8)
  },
}

export const FRAMES: Frame[] = [
  border('border-black', 'Borda preta', '#000'),
  border('border-white', 'Borda branca', '#fff'),
  phone,
  laptop,
]
