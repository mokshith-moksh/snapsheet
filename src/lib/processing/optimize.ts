import type { ImageAnalysis, ImageKind, PrintOptimization } from '../../types'
import { luma } from '../analysis/pixels'

export function applyPrintOptimization(
  data: ImageData,
  analysis: ImageAnalysis,
  mode: PrintOptimization,
): ImageData {
  if (mode === 'original' || (analysis.kind === 'photograph' && mode === 'smart')) return data

  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height)
  const px = out.data
  const aggressive = mode === 'ink'

  if (analysis.kind === 'photograph') {
    if (aggressive) whitenPaper(px, 238)
    return out
  }

  if (shouldRemapDark(analysis)) {
    remapDarkSlide(px, analysis.kind, aggressive)
    return out
  }

  whitenPaper(px, aggressive ? 228 : 246)
  if (aggressive) {
    for (let i = 0; i < px.length; i += 4) {
      const l = luma(px[i], px[i + 1], px[i + 2])
      if (l < 70 && chroma(px[i], px[i + 1], px[i + 2]) < 28) {
        px[i] = 20
        px[i + 1] = 20
        px[i + 2] = 20
      }
    }
  }
  return out
}

function shouldRemapDark(analysis: ImageAnalysis): boolean {
  if (analysis.kind === 'dark_text_slide') return true
  if (!analysis.darkBackground) return false
  return analysis.kind === 'mixed' || analysis.kind === 'diagram'
}

/**
 * Dark paper becomes white and light text becomes near-black along one smooth curve.
 * A hard cutoff here eats the gray edge of each stroke and leaves the holes in the sample.
 * Pixels with real color (not JPEG chroma noise) stay as they are.
 */
function remapDarkSlide(px: Uint8ClampedArray, kind: ImageKind, aggressive: boolean) {
  const colorFloor = kind === 'diagram' ? 36 : 64
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    const l = luma(r, g, b)
    const c = chroma(r, g, b)
    if (c > colorFloor && l > 50 && l < 242) continue
    const v = remapLuma(l, aggressive)
    px[i] = v
    px[i + 1] = v
    px[i + 2] = v
  }
}

function remapLuma(l: number, aggressive: boolean): number {
  const whiteUntil = aggressive ? 46 : 30
  const blackFrom = aggressive ? 132 : 170
  const black = aggressive ? 14 : 22
  if (l <= whiteUntil) return 255
  if (l >= blackFrom) return black
  const t = (l - whiteUntil) / (blackFrom - whiteUntil)
  const s = t * t * (3 - 2 * t)
  return Math.round(255 - s * (255 - black))
}

function whitenPaper(px: Uint8ClampedArray, threshold: number) {
  for (let i = 0; i < px.length; i += 4) {
    const l = luma(px[i], px[i + 1], px[i + 2])
    if (l > threshold) {
      px[i] = 255
      px[i + 1] = 255
      px[i + 2] = 255
    }
  }
}

function chroma(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b)
}

export function jpegQuality(quality: 'standard' | 'high' | 'ink'): number {
  switch (quality) {
    case 'high':
      return 0.92
    case 'ink':
      return 0.82
    default:
      return 0.88
  }
}

export function processMaxEdge(quality: 'standard' | 'high' | 'ink'): number {
  switch (quality) {
    case 'high':
      return 2800
    case 'ink':
      return 1800
    default:
      return 2200
  }
}
