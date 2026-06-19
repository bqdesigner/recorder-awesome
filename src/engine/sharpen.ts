/**
 * Nitidez do downscale do GIF.
 *
 * Quando o modo "Auto" reduz a captura (ex: 1920px → 1280px), um único passo
 * de redução bilinear suaviza texto/bordas de UI — é a origem dominante do blur
 * no export default depois das tasks #6/#9. Aqui ficam as duas funções PURAS que
 * atacam isso (a cola com `<canvas>` mora no `encode.ts`):
 * - `halvingSteps`: sequência de tamanhos intermediários pra reduzir em saltos
 *   de ~2× (step-down) em vez de um salto grande só — preserva mais detalhe.
 * - `unsharpMask`: realce de borda (unsharp) aplicado no frame já reduzido.
 */

/**
 * Sequência de tamanhos pra um downscale progressivo de (sw,sh) até (dw,dh).
 * Enquanto a dimensão atual for maior que o DOBRO do alvo, reduz pela metade;
 * o último passo cai exatamente no alvo. Reduções pequenas (≤2×) devolvem um
 * passo só. Sem downscale (alvo ≥ origem) também devolve um passo (cópia 1:1).
 * Pura — testável sem canvas.
 */
export function halvingSteps(
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): { w: number; h: number }[] {
  const steps: { w: number; h: number }[] = []
  let w = sw
  let h = sh
  while (w > dw * 2 && h > dh * 2) {
    w = Math.round(w / 2)
    h = Math.round(h / 2)
    steps.push({ w, h })
  }
  steps.push({ w: dw, h: dh })
  return steps
}

/** Intensidade default do unsharp (quanto do detalhe de alta frequência somar). */
export const UNSHARP_AMOUNT = 0.6

/**
 * Unsharp mask in-place: `out = src + amount·(src − blur)`, com `blur` = média
 * 3×3 (borda replicada). Recupera a nitidez de borda perdida na redução sem
 * tocar regiões chapadas (vizinhança constante → `src − blur = 0` → inalterado),
 * o que evita sujar áreas lisas. Alpha preservado. Clamp 0..255 via
 * Uint8ClampedArray. Pura — não depende de canvas.
 */
export function unsharpMask(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  amount = UNSHARP_AMOUNT,
): Uint8ClampedArray {
  if (amount <= 0 || w < 3 || h < 3) return rgba
  const src = new Uint8ClampedArray(rgba) // cópia da entrada pra ler o original
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0
    const y1 = y < h - 1 ? y + 1 : h - 1
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0
      const x1 = x < w - 1 ? x + 1 : w - 1
      const o = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const blur =
          (src[(y0 * w + x0) * 4 + c] + src[(y0 * w + x) * 4 + c] + src[(y0 * w + x1) * 4 + c] +
            src[(y * w + x0) * 4 + c] + src[o + c] + src[(y * w + x1) * 4 + c] +
            src[(y1 * w + x0) * 4 + c] + src[(y1 * w + x) * 4 + c] + src[(y1 * w + x1) * 4 + c]) / 9
        const v = src[o + c]
        rgba[o + c] = v + amount * (v - blur)
      }
      // alpha intacto
    }
  }
  return rgba
}
