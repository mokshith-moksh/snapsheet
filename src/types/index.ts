export type ImageKind =
  | 'dark_text_slide'
  | 'white_slide'
  | 'photograph'
  | 'diagram'
  | 'mixed'

export type PrintOptimization = 'original' | 'smart' | 'ink'
export type QualityPreset = 'standard' | 'high' | 'ink'
export type LayoutMode = 'auto' | 'single' | 'two' | 'custom'
export type Orientation = 'portrait' | 'landscape'
export type MarginPreset = 'small' | 'medium' | 'large' | 'custom'
export type CuttingGuides = 'none' | 'border' | 'dashed'
export type SpacingPreset = 'tight' | 'normal' | 'roomy'
export type ReadableFloor = 'compact' | 'standard' | 'large'

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export interface ImageAnalysis {
  kind: ImageKind
  darkBackground: boolean
  meanLuma: number
  borderLuma: number
  innerLuma: number
  saturation: number
  highSatRatio: number
  darkRatio: number
  lightRatio: number
  variance: number
  edgeDensity: number
  suggestedCrop: CropRect | null
}

export interface SourceImage {
  id: string
  name: string
  file: File
  objectUrl: string
  thumbUrl: string
  width: number
  height: number
  rotation: 0 | 90 | 180 | 270
  crop: CropRect | null
  analysis: ImageAnalysis | null
  status: 'loading' | 'ready' | 'error'
  error?: string
  fingerprint: string
  dhash: string
  duplicateOf: string | null
  printMode: PrintOptimization | null
}

export interface LayoutPlacement {
  imageId: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutPage {
  index: number
  items: LayoutPlacement[]
}

export interface LayoutResult {
  pageWidth: number
  pageHeight: number
  pages: LayoutPage[]
}

export interface AppSettings {
  optimization: PrintOptimization
  quality: QualityPreset
  layout: LayoutMode
  itemsPerPage: number
  orientation: Orientation
  marginPreset: MarginPreset
  customMarginMm: number
  spacing: SpacingPreset
  cuttingGuides: CuttingGuides
  autoCrop: boolean
  readableFloor: ReadableFloor
  registrationMarks: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  optimization: 'smart',
  quality: 'standard',
  layout: 'auto',
  itemsPerPage: 4,
  orientation: 'portrait',
  marginPreset: 'medium',
  customMarginMm: 12,
  spacing: 'normal',
  cuttingGuides: 'border',
  autoCrop: true,
  readableFloor: 'standard',
  registrationMarks: true,
}

export const ACCEPTED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
]

export const ACCEPTED_EXT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.gif',
  '.bmp',
]
