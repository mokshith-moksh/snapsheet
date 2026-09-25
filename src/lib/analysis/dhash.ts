import { luma } from './pixels'

const GRID = 64

/** Marks pixels that stand away from the average, so text layout survives a flat background. */
export function dHash(data: ImageData): string {
  const vals: number[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const sx = Math.min(data.width - 1, Math.round(((x + 0.5) * data.width) / GRID))
      const sy = Math.min(data.height - 1, Math.round(((y + 0.5) * data.height) / GRID))
      const i = (sy * data.width + sx) * 4
      vals.push(luma(data.data[i], data.data[i + 1], data.data[i + 2]))
    }
  }
  const mean = vals.reduce((sum, value) => sum + value, 0) / vals.length
  return vals.map((value) => (Math.abs(value - mean) > 18 ? '1' : '0')).join('')
}

export function hamming(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return GRID * GRID
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

export function hashOnes(hash: string): number {
  let n = 0
  for (let i = 0; i < hash.length; i++) if (hash[i] === '1') n++
  return n
}

export const DUPLICATE_HAMMING = 48
export const DUPLICATE_LUMA = 24
export const DUPLICATE_MIN_ONES = 12
