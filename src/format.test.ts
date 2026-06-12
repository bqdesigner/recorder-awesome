import { describe, expect, it } from 'vitest'
import { formatElapsed } from './format'

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
