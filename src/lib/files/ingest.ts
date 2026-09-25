import type { SourceImage } from '../../types'
import { ACCEPTED_EXT, ACCEPTED_MIME } from '../../types'
import { DUPLICATE_HAMMING, DUPLICATE_LUMA, DUPLICATE_MIN_ONES, hashOnes, hamming } from '../analysis/dhash'
import { MAX_FILE_BYTES, decodeImage, makeThumbnail } from './imageIO'
import { analyzeBitmap } from '../processing/pipeline'

export interface IngestResult {
  images: SourceImage[]
  errors: string[]
}

export function fingerprintOf(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`
}

export function isProbablySupported(file: File): { ok: boolean; reason?: string } {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) {
    return {
      ok: false,
      reason: `${file.name}: PDF import is not in this version. Export slides as images (PNG or JPG) instead.`,
    }
  }
  const extOk = ACCEPTED_EXT.some((ext) => name.endsWith(ext))
  const mimeOk = !file.type || ACCEPTED_MIME.includes(file.type) || file.type.startsWith('image/')
  if (!extOk && !mimeOk) {
    return { ok: false, reason: `${file.name}: this file type is not supported.` }
  }
  if (name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic') {
    return { ok: true }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `${file.name}: this file is too large to process in the browser.` }
  }
  return { ok: true }
}

export async function ingestFiles(
  files: File[],
  existing: SourceImage[],
  onProgress?: (done: number, total: number, name: string) => void,
  onImage?: (image: SourceImage) => void,
): Promise<IngestResult> {
  const errors: string[] = []
  const images: SourceImage[] = []
  const seen = new Set(existing.map((img) => img.fingerprint))
  const hashes = existing
    .filter((img) => img.dhash)
    .map((img) => ({
      id: img.id,
      name: img.name,
      dhash: img.dhash,
      meanLuma: img.analysis?.meanLuma ?? 0,
      ones: hashOnes(img.dhash),
    }))
  const list = Array.from(files)
  let done = 0

  for (const file of list) {
    const check = isProbablySupported(file)
    if (!check.ok) {
      errors.push(check.reason || `${file.name}: skipped.`)
      done++
      onProgress?.(done, list.length, file.name)
      continue
    }
    const fingerprint = fingerprintOf(file)
    if (seen.has(fingerprint)) {
      errors.push(`${file.name}: skipped because it looks like a duplicate.`)
      done++
      onProgress?.(done, list.length, file.name)
      continue
    }
    seen.add(fingerprint)

    const id = crypto.randomUUID()
    const objectUrl = URL.createObjectURL(file)
    try {
      const bitmap = await decodeImage(file)
      if (bitmap.width * bitmap.height > 5_000_000) {
        errors.push(
          `${file.name}: this capture is very large, so working copies are reduced before print processing.`,
        )
      }
      const thumbBlob = await makeThumbnail(bitmap)
      const thumbUrl = URL.createObjectURL(thumbBlob)
      let analysis = null
      let hash = ''
      try {
        const studied = await analyzeBitmap(bitmap)
        analysis = studied.analysis
        hash = studied.dhash
      } catch {
        analysis = null
      }
      const meanLuma = analysis?.meanLuma ?? -1
      const ones = hash ? hashOnes(hash) : 0
      const twin =
        hash && ones >= DUPLICATE_MIN_ONES
          ? hashes.find(
              (item) =>
                item.ones >= DUPLICATE_MIN_ONES &&
                hamming(item.dhash, hash) <= DUPLICATE_HAMMING &&
                Math.abs(item.meanLuma - meanLuma) <= DUPLICATE_LUMA,
            )
          : undefined
      if (twin) {
        errors.push(`${file.name} looks like a duplicate of ${twin.name}. You can remove duplicates from the list.`)
      }
      const image: SourceImage = {
        id,
        name: file.name || `screenshot-${images.length + 1}.png`,
        file,
        objectUrl,
        thumbUrl,
        width: bitmap.width,
        height: bitmap.height,
        rotation: 0,
        crop: null,
        analysis,
        status: 'ready',
        fingerprint,
        dhash: hash,
        duplicateOf: twin?.id ?? null,
        printMode: null,
      }
      if (hash) hashes.push({ id, name: image.name, dhash: hash, meanLuma, ones })
      bitmap.close()
      images.push(image)
      onImage?.(image)
    } catch {
      URL.revokeObjectURL(objectUrl)
      const heic = /\.heic$|\.heif$/i.test(file.name)
      errors.push(
        heic
          ? `${file.name}: HEIC is not supported in this browser. Convert it to JPG or PNG first.`
          : `${file.name}: this image could not be read. It may be damaged.`,
      )
    }
    done++
    onProgress?.(done, list.length, file.name)
    await yieldToMain()
  }

  return { images, errors }
}

export function revokeImage(image: SourceImage) {
  URL.revokeObjectURL(image.objectUrl)
  URL.revokeObjectURL(image.thumbUrl)
}

function yieldToMain() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}
