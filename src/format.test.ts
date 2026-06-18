import { describe, expect, it } from 'vitest'
import { exportFilename, formatElapsed } from './format'

describe('formatElapsed', () => {
  it('formata zero', () => {
    expect(formatElapsed(0)).toBe('0:00')
  })

  it('zero-pad nos segundos abaixo de 10', () => {
    expect(formatElapsed(5)).toBe('0:05')
  })

  it('segundos sem minutos', () => {
    expect(formatElapsed(45)).toBe('0:45')
  })

  it('vira minuto em 60s', () => {
    expect(formatElapsed(60)).toBe('1:00')
  })

  it('minutos e segundos', () => {
    expect(formatElapsed(83)).toBe('1:23')
  })

  it('dois dígitos de minuto', () => {
    expect(formatElapsed(727)).toBe('12:07')
  })

  it('trunca frações de segundo', () => {
    expect(formatElapsed(5.9)).toBe('0:05')
  })

  it('trata negativo como zero', () => {
    expect(formatElapsed(-3)).toBe('0:00')
  })
})

describe('exportFilename', () => {
  const date = new Date(2026, 5, 18, 18, 30, 45) // 2026-06-18 18:30:45 (mês 0-based)

  it('monta nome com prefixo, timestamp e extensão', () => {
    expect(exportFilename('gif', date)).toBe('RecordingAwesome-2026-06-18_18-30-45.gif')
  })

  it('respeita a extensão passada', () => {
    expect(exportFilename('mp4', date)).toBe('RecordingAwesome-2026-06-18_18-30-45.mp4')
  })

  it('zero-pad em mês, dia, hora, minuto e segundo de um dígito', () => {
    const d = new Date(2026, 0, 3, 4, 5, 6) // 2026-01-03 04:05:06
    expect(exportFilename('gif', d)).toBe('RecordingAwesome-2026-01-03_04-05-06.gif')
  })

  it('usa a data atual quando nenhuma é passada', () => {
    expect(exportFilename('gif')).toMatch(
      /^RecordingAwesome-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.gif$/,
    )
  })
})
