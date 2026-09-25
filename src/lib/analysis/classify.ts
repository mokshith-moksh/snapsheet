import type { ImageAnalysis, ImageKind } from '../../types'
import { sampleStats } from './pixels'
import { detectAutoCrop } from './cropDetect'

export function classifyImage(data: ImageData): ImageAnalysis {
  const s = sampleStats(data, 1)
  const darkBackground = s.borderLuma < 85 && s.darkRatio > 0.35
  const whiteBackground = s.borderLuma > 188 && s.lightRatio > 0.45
  const colorful = s.highSatRatio > 0.08
  const veryColorful = s.highSatRatio > 0.28
  const highVariance = s.variance > 2500
  const bimodal = s.darkRatio > 0.15 && s.lightRatio > 0.15
  const photoLike =
    veryColorful &&
    s.variance > 300 &&
    s.edgeDensity < 0.08 &&
    !darkBackground &&
    !whiteBackground

  let kind: ImageKind

  if (photoLike) {
    kind = 'photograph'
  } else if (darkBackground && highVariance && colorful) {
    kind = 'mixed'
  } else if (darkBackground) {
    kind = 'dark_text_slide'
  } else if (whiteBackground && s.highSatRatio > 0.02 && s.variance > 600) {
    kind = 'diagram'
  } else if (whiteBackground) {
    kind = 'white_slide'
  } else if (bimodal && !veryColorful) {
    kind = 'mixed'
  } else if (veryColorful) {
    kind = 'photograph'
  } else {
    kind = 'diagram'
  }

  return {
    kind,
    darkBackground,
    meanLuma: s.meanLuma,
    borderLuma: s.borderLuma,
    innerLuma: s.innerLuma,
    saturation: s.saturation,
    highSatRatio: s.highSatRatio,
    darkRatio: s.darkRatio,
    lightRatio: s.lightRatio,
    variance: s.variance,
    edgeDensity: s.edgeDensity,
    suggestedCrop: detectAutoCrop(data),
  }
}

export function kindLabel(kind: ImageKind): string {
  switch (kind) {
    case 'dark_text_slide':
      return 'Dark slide'
    case 'white_slide':
      return 'Light slide'
    case 'photograph':
      return 'Photo'
    case 'diagram':
      return 'Diagram'
    case 'mixed':
      return 'Mixed'
  }
}
