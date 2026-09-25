import type {
  AppSettings,
  CropRect,
  ImageAnalysis,
  PrintOptimization,
  SourceImage,
} from '../../types'
import { classifyImage } from '../analysis/classify'
import { applyPrintOptimization, jpegQuality, processMaxEdge } from './optimize'
import { dHash } from '../analysis/dhash'
import { analyzeInWorker, optimizeInWorker } from './workerClient'
import {
  canvasToBlob,
  decodeImage,
  extractRegion,
  getImageData,
  putImageData,
  analysisCanvas,
} from '../files/imageIO'

const cache = new Map<string, { url: string; blob: Blob }>()
const cacheOrder: string[] = []
const CACHE_LIMIT = 24

function cacheKey(
  id: string,
  rotation: number,
  crop: CropRect | null,
  optimization: string,
  quality: string,
  autoCrop: boolean,
): string {
  const c = crop ? `${crop.x.toFixed(3)},${crop.y.toFixed(3)},${crop.w.toFixed(3)},${crop.h.toFixed(3)}` : 'full'
  return `${id}|${rotation}|${c}|${optimization}|${quality}|${autoCrop}`
}

export function effectiveOptimization(
  image: SourceImage,
  fallback: PrintOptimization,
  forceOriginal = false,
): PrintOptimization {
  if (forceOriginal) return 'original'
  return image.printMode ?? fallback
}

function remember(key: string, blob: Blob, url: string) {
  cache.set(key, { blob, url })
  cacheOrder.push(key)
  while (cacheOrder.length > CACHE_LIMIT) {
    const old = cacheOrder.shift()
    if (!old) break
    const entry = cache.get(old)
    if (entry) {
      URL.revokeObjectURL(entry.url)
      cache.delete(old)
    }
  }
}

export function effectiveCrop(
  image: SourceImage,
  autoCrop: boolean,
): CropRect | null {
  if (image.crop) return image.crop
  if (autoCrop) return image.analysis?.suggestedCrop ?? null
  return null
}

export async function analyzeBitmap(
  bitmap: ImageBitmap,
): Promise<{ analysis: ImageAnalysis; dhash: string }> {
  const { canvas } = analysisCanvas(bitmap)
  const data = getImageData(canvas)
  const hash = dHash(data)
  let analysis: ImageAnalysis
  try {
    analysis = await analyzeInWorker(data)
  } catch {
    analysis = classifyImage(data)
  }
  if (analysis.suggestedCrop) {
    const inner = classifyImage(cropImageData(data, analysis.suggestedCrop))
    analysis = { ...inner, suggestedCrop: analysis.suggestedCrop }
  }
  return { analysis, dhash: hash }
}

function cropImageData(data: ImageData, crop: CropRect): ImageData {
  const x = Math.min(data.width - 1, Math.max(0, Math.round(crop.x * data.width)))
  const y = Math.min(data.height - 1, Math.max(0, Math.round(crop.y * data.height)))
  const w = Math.max(1, Math.min(data.width - x, Math.round(crop.w * data.width)))
  const h = Math.max(1, Math.min(data.height - y, Math.round(crop.h * data.height)))
  const out = new ImageData(w, h)
  for (let row = 0; row < h; row++) {
    const src = ((y + row) * data.width + x) * 4
    out.data.set(data.data.subarray(src, src + w * 4), row * w * 4)
  }
  return out
}

export async function renderProcessed(
  image: SourceImage,
  settings: Pick<AppSettings, 'optimization' | 'quality' | 'autoCrop'>,
  maxEdge = processMaxEdge(settings.quality),
  forceOriginal = false,
): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  const crop = effectiveCrop(image, settings.autoCrop)
  const mode = effectiveOptimization(image, settings.optimization, forceOriginal)
  const key = cacheKey(
    image.id,
    image.rotation,
    crop,
    mode,
    settings.quality,
    settings.autoCrop,
  )
  const hit = cache.get(key)
  if (hit) {
    const bmp = await createImageBitmap(hit.blob)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return { blob: hit.blob, url: hit.url, ...size }
  }

  const bitmap = await decodeImage(image.file)
  try {
    const data = extractRegion(bitmap, crop, image.rotation, maxEdge)
    const analysis = image.analysis
    let optimized = data
    if (analysis && mode !== 'original') {
      try {
        optimized = await optimizeInWorker(data, analysis, mode)
      } catch {
        optimized = applyPrintOptimization(data, analysis, mode)
      }
    }
    const canvas = putImageData(optimized)
    const blob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality(settings.quality))
    const url = URL.createObjectURL(blob)
    remember(key, blob, url)
    return { blob, url, width: optimized.width, height: optimized.height }
  } finally {
    bitmap.close()
  }
}

export function clearProcessedCache() {
  for (const entry of cache.values()) URL.revokeObjectURL(entry.url)
  cache.clear()
  cacheOrder.length = 0
}
