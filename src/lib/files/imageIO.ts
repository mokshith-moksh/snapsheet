import type { CropRect } from '../../types'

const MAX_SOURCE_PIXELS = 24_000_000
const THUMB_EDGE = 280
const ANALYSIS_EDGE = 360

export const MAX_FILE_BYTES = 80 * 1024 * 1024

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement
type AnyCtx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D

function get2d(canvas: AnyCanvas): AnyCtx {
  const ctx = canvas.getContext('2d') as AnyCtx | null
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  return ctx
}

export async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadHtmlImage(url)
      return await createImageBitmap(img)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read this image.'))
    img.src = url
  })
}

export function downscaleBitmap(
  bitmap: ImageBitmap,
  maxEdge: number,
): { canvas: AnyCanvas; width: number; height: number } {
  let { width, height } = bitmap
  const pixels = width * height
  let scale = 1
  if (Math.max(width, height) > maxEdge) {
    scale = maxEdge / Math.max(width, height)
  }
  if (pixels * scale * scale > MAX_SOURCE_PIXELS) {
    scale = Math.sqrt(MAX_SOURCE_PIXELS / pixels)
  }
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = makeCanvas(w, h)
  const ctx = get2d(canvas)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  return { canvas, width: w, height: h }
}

export function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

export function canvasToBlob(
  canvas: AnyCanvas,
  type: string,
  quality?: number,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not encode the image.'))
      },
      type,
      quality,
    )
  })
}

export async function makeThumbnail(bitmap: ImageBitmap): Promise<Blob> {
  const { canvas } = downscaleBitmap(bitmap, THUMB_EDGE)
  return canvasToBlob(canvas, 'image/jpeg', 0.72)
}

export function getImageData(canvas: AnyCanvas): ImageData {
  const ctx = get2d(canvas)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export function putImageData(data: ImageData): AnyCanvas {
  const canvas = makeCanvas(data.width, data.height)
  get2d(canvas).putImageData(data, 0, 0)
  return canvas
}

export function extractRegion(
  bitmap: ImageBitmap,
  crop: CropRect | null,
  rotation: 0 | 90 | 180 | 270,
  maxEdge: number,
): ImageData {
  const srcW = bitmap.width
  const srcH = bitmap.height
  const cx = crop ? crop.x * srcW : 0
  const cy = crop ? crop.y * srcH : 0
  const cw = crop ? crop.w * srcW : srcW
  const ch = crop ? crop.h * srcH : srcH

  const rotated = rotation === 90 || rotation === 270
  let outW = rotated ? ch : cw
  let outH = rotated ? cw : ch
  const scale = Math.min(1, maxEdge / Math.max(outW, outH))
  outW = Math.max(1, Math.round(outW * scale))
  outH = Math.max(1, Math.round(outH * scale))

  const canvas = makeCanvas(outW, outH)
  const ctx = get2d(canvas)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.save()
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  const drawW = rotated ? outH : outW
  const drawH = rotated ? outW : outH
  ctx.drawImage(bitmap, cx, cy, cw, ch, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()
  return getImageData(canvas)
}

export function analysisCanvas(bitmap: ImageBitmap) {
  return downscaleBitmap(bitmap, ANALYSIS_EDGE)
}
