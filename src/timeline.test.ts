import { describe, expect, it } from 'vitest'
import { timeToPct } from './timeline'

describe('timeToPct', () => {
  it('mapeia início e fim para 0 e 100', () => {
    expect(timeToPct(0, 0, 10)).toBe(0)
    expect(timeToPct(10, 0, 10)).toBe(100)
  })

  it('mapeia o meio proporcionalmente', () => {
    expect(timeToPct(5, 0, 10)).toBe(50)
    expect(timeToPct(3, 2, 6)).toBe(25)
  })

  it('limita valores fora das bordas a 0..100', () => {
    expect(timeToPct(-1, 0, 10)).toBe(0)
    expect(timeToPct(99, 0, 10)).toBe(100)
  })

  it('não divide por zero quando min == max', () => {
    expect(timeToPct(0, 5, 5)).toBe(0)
  })
})
