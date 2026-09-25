import type { CropRect } from '../../types'
import { luma } from './pixels'

/**
 * Conservative margin trim. Only crops when a side has a large, uniform border
 * similar to the corner color. Never crops into likely content.
 */
export function detectAutoCrop(data: ImageData): CropRect | null {
  const { data: px, width, height } = data
  const corners = [
    pixelAt(px, width, 2, 2),
    pixelAt(px, width, width - 3, 2),
    pixelAt(px, width, 2, height - 3),
    pixelAt(px, width, width - 3, height - 3),
  ]
  const borderL = corners.reduce((a, c) => a + luma(c[0], c[1], c[2]), 0) / 4
  const uniform =
    corners.every((c) => Math.abs(luma(c[0], c[1], c[2]) - borderL) < 28)
  if (!uniform) return null

  const threshold = 28
  const minContent = 0.035
  const step = Math.max(1, Math.floor(Math.min(width, height) / 180))

  const rowContent = (y: number) => {
    let diff = 0
    let n = 0
    for (let x = 0; x < width; x += step) {
      const [r, g, b] = pixelAt(px, width, x, y)
      if (Math.abs(luma(r, g, b) - borderL) > threshold) diff++
      n++
    }
    return n ? diff / n : 0
  }

  const colContent = (x: number) => {
    let diff = 0
    let n = 0
    for (let y = 0; y < height; y += step) {
      const [r, g, b] = pixelAt(px, width, x, y)
      if (Math.abs(luma(r, g, b) - borderL) > threshold) diff++
      n++
    }
    return n ? diff / n : 0
  }

  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1

  const maxTrim = Math.floor(Math.min(width, height) * 0.28)

  while (top < maxTrim && rowContent(top) < minContent) top += step
  while (bottom > height - 1 - maxTrim && rowContent(bottom) < minContent) {
    bottom -= step
  }
  while (left < maxTrim && colContent(left) < minContent) left += step
  while (right > width - 1 - maxTrim && colContent(right) < minContent) {
    right -= step
  }

  const padX = Math.max(2, Math.round(width * 0.012))
  const padY = Math.max(2, Math.round(height * 0.012))
  top = Math.max(0, top - padY)
  left = Math.max(0, left - padX)
  bottom = Math.min(height - 1, bottom + padY)
  right = Math.min(width - 1, right + padX)

  const w = right - left + 1
  const h = bottom - top + 1
  const trimmed =
    left > width * 0.03 ||
    top > height * 0.03 ||
    width - w > width * 0.03 ||
    height - h > height * 0.03

  if (!trimmed || w < width * 0.55 || h < height * 0.55) return null

  return {
    x: left / width,
    y: top / height,
    w: w / width,
    h: h / height,
  }
}

function pixelAt(
  px: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number] {
  const i = (y * width + x) * 4
  return [px[i], px[i + 1], px[i + 2]]
}
