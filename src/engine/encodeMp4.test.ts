import { describe, it, expect } from 'vitest'
import { mp4OutputSize, mp4Bitrate, MP4_MAX_DIMENSION, MP4_FPS } from './encodeMp4'
import { autoScale } from './encode'

describe('mp4OutputSize', () => {
  it('sem redução devolve a cena composta, arredondada pra par', () => {
    expect(mp4OutputSize(1920, 1080, 1)).toEqual({ width: 1920, height: 1080 })
    expect(mp4OutputSize(1281, 721, 1)).toEqual({ width: 1282, height: 722 })
  })

  it('aplica a escala antes de parear', () => {
    expect(mp4OutputSize(2560, 1440, 0.5)).toEqual({ width: 1280, height: 720 })
    // 1281×0.5 = 640,5 → arredonda pra 641 (ímpar) → sobe pra 642
    expect(mp4OutputSize(1281, 1081, 0.5)).toEqual({ width: 642, height: 542 })
  })

  it('nunca amplia nem devolve lado menor que 2', () => {
    expect(mp4OutputSize(800, 600, 3)).toEqual({ width: 800, height: 600 })
    expect(mp4OutputSize(10, 10, 0.01)).toEqual({ width: 2, height: 2 })
  })
})

describe('Auto do MP4 (autoScale + MP4_MAX_DIMENSION)', () => {
  it('captura acima de 1080p desce até o teto, em lado par', () => {
    // caso que quebrava o export: 3072×1728 não tem perfil H.264 até level 4.0
    const s = autoScale(3072, 1728, MP4_MAX_DIMENSION)
    expect(mp4OutputSize(3072, 1728, s)).toEqual({ width: 1920, height: 1080 })
  })

  it('captura que já cabe no teto passa intacta', () => {
    const s = autoScale(1600, 900, MP4_MAX_DIMENSION)
    expect(s).toBe(1)
    expect(mp4OutputSize(1600, 900, s)).toEqual({ width: 1600, height: 900 })
  })

  it('teto do MP4 é mais alto que o do GIF', () => {
    expect(autoScale(3072, 1728, MP4_MAX_DIMENSION)).toBeGreaterThan(autoScale(3072, 1728))
  })
})

describe('mp4Bitrate', () => {
  it('escala com pixels × fps (~0,2 bit por pixel por frame)', () => {
    expect(mp4Bitrate(1920, 1080, MP4_FPS)).toBe(Math.round(1920 * 1080 * 30 * 0.2))
    // metade da área → metade do bitrate → metade do arquivo
    expect(mp4Bitrate(960, 540, MP4_FPS) * 4).toBe(mp4Bitrate(1920, 1080, MP4_FPS))
  })

  it('trava no teto de 50 Mbps', () => {
    // 4K a 30fps dá 49,8 Mbps: o teto só entra acima disso (5K, 60fps)
    expect(mp4Bitrate(3840, 2160, MP4_FPS)).toBeLessThan(50_000_000)
    expect(mp4Bitrate(5120, 2880, MP4_FPS)).toBe(50_000_000)
    expect(mp4Bitrate(3840, 2160, 60)).toBe(50_000_000)
  })
})
