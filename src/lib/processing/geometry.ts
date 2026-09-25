import type { CropRect } from '../../types'

export function rotatedSize(
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
): { width: number; height: number } {
  if (rotation === 90 || rotation === 270) return { width: height, height: width }
  return { width, height }
}

export function displayAspect(
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
  crop: CropRect | null,
): number {
  const size = rotatedSize(width, height, rotation)
  const cw = (crop?.w ?? 1) * size.width
  const ch = (crop?.h ?? 1) * size.height
  if (ch === 0) return 1
  return cw / ch
}

export function nextRotation(
  current: 0 | 90 | 180 | 270,
): 0 | 90 | 180 | 270 {
  return ((current + 90) % 360) as 0 | 90 | 180 | 270
}

export function clampCrop(crop: CropRect): CropRect {
  const x = Math.min(0.95, Math.max(0, crop.x))
  const y = Math.min(0.95, Math.max(0, crop.y))
  const w = Math.min(1 - x, Math.max(0.05, crop.w))
  const h = Math.min(1 - y, Math.max(0.05, crop.h))
  return { x, y, w, h }
}
