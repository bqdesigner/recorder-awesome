/**
 * Quantizador de paleta em RGB 8-bit pleno (median cut).
 *
 * Substitui o `quantize` do gifenc no caminho de GIF: aquele trabalha numa
 * grade rgb565 (5-6-5 bits), que colapsa os cinzas escuros de UIs dark e
 * "tinge" superfícies com a cor de elementos vizinhos. Aqui:
 * - histograma exato em 24-bit;
 * - se o conteúdo tem ≤ maxColors cores únicas (comum em screencast de UI),
 *   a paleta é EXATA — saída sem perda;
 * - senão, median cut clássico ponderado por população, cortando sempre a
 *   caixa de maior variância no canal mais largo.
 */

interface Box {
  /** Cores (chaves 24-bit) pertencentes à caixa. */
  colors: number[]
  /** População total (soma das contagens). */
  pop: number
}

/** Quantiza um buffer RGBA para até `maxColors` cores. Ignora alpha. */
export function quantizeRGB(
  rgba: Uint8ClampedArray | Uint8Array,
  maxColors: number,
): number[][] {
  // histograma exato 24-bit
  const hist = new Map<number, number>()
  for (let i = 0; i < rgba.length; i += 4) {
    const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2]
    hist.set(key, (hist.get(key) ?? 0) + 1)
  }

  // poucas cores → paleta exata (sem perda)
  if (hist.size <= maxColors) {
    return [...hist.keys()].map((k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255])
  }

  // median cut: começa com uma caixa com tudo, corta até maxColors caixas
  const first: Box = { colors: [...hist.keys()], pop: 0 }
  for (const c of first.colors) first.pop += hist.get(c)!
  const boxes: Box[] = [first]

  while (boxes.length < maxColors) {
    // caixa com maior população e mais de 1 cor
    let bi = -1
    let bp = -1
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].colors.length > 1 && boxes[i].pop > bp) {
        bp = boxes[i].pop
        bi = i
      }
    }
    if (bi < 0) break // nada mais pra cortar

    const box = boxes[bi]
    // canal de maior amplitude
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0
    for (const c of box.colors) {
      const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255
      if (r < rMin) rMin = r
      if (r > rMax) rMax = r
      if (g < gMin) gMin = g
      if (g > gMax) gMax = g
      if (b < bMin) bMin = b
      if (b > bMax) bMax = b
    }
    const dr = rMax - rMin, dg = gMax - gMin, db = bMax - bMin
    const shift = dg >= dr && dg >= db ? 8 : dr >= db ? 16 : 0

    // ordena pelo canal escolhido e corta na mediana da população
    box.colors.sort((a, b) => ((a >> shift) & 255) - ((b >> shift) & 255))
    const half = box.pop / 2
    let acc = 0
    let cut = 0
    while (cut < box.colors.length - 1 && acc < half) {
      acc += hist.get(box.colors[cut])!
      cut++
    }

    const left: Box = { colors: box.colors.slice(0, cut), pop: 0 }
    const right: Box = { colors: box.colors.slice(cut), pop: 0 }
    for (const c of left.colors) left.pop += hist.get(c)!
    right.pop = box.pop - left.pop
    boxes[bi] = left
    boxes.push(right)
  }

  // cor final de cada caixa = média ponderada por população
  return boxes.map((box) => {
    let r = 0, g = 0, b = 0, n = 0
    for (const c of box.colors) {
      const w = hist.get(c)!
      r += ((c >> 16) & 255) * w
      g += ((c >> 8) & 255) * w
      b += (c & 255) * w
      n += w
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
  })
}
