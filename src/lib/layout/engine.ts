import type {
  AppSettings,
  LayoutPlacement,
  LayoutResult,
  SourceImage,
} from '../../types'
import { displayAspect } from '../processing/geometry'

export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297

export function readableLimits(floor: AppSettings['readableFloor']) {
  switch (floor) {
    case 'compact':
      return { width: 36, height: 28 }
    case 'large':
      return { width: 64, height: 50 }
    default:
      return { width: 48, height: 38 }
  }
}

export function pageDimensions(orientation: AppSettings['orientation']) {
  return orientation === 'landscape'
    ? { width: A4_HEIGHT_MM, height: A4_WIDTH_MM }
    : { width: A4_WIDTH_MM, height: A4_HEIGHT_MM }
}

export function marginMm(settings: AppSettings): number {
  switch (settings.marginPreset) {
    case 'small':
      return 8
    case 'large':
      return 18
    case 'custom':
      return Math.min(40, Math.max(4, settings.customMarginMm))
    default:
      return 12
  }
}

export function gapMm(settings: AppSettings): number {
  switch (settings.spacing) {
    case 'tight':
      return 4
    case 'roomy':
      return 12
    default:
      return 7
  }
}

export function layoutImages(
  images: SourceImage[],
  settings: AppSettings,
): LayoutResult {
  const page = pageDimensions(settings.orientation)
  const margin = marginMm(settings)
  const gap = gapMm(settings)
  const ready = images.filter((img) => img.status === 'ready')

  if (settings.layout === 'custom') {
    return layoutCustom(ready, settings, page, margin, gap)
  }

  const forcePair = settings.layout === 'two'
  const forceSingle = settings.layout === 'single'
  return layoutFlow(ready, settings, page, margin, gap, forcePair, forceSingle)
}

function aspectOf(img: SourceImage, settings: AppSettings): number {
  const usedCrop =
    img.crop ?? (settings.autoCrop ? img.analysis?.suggestedCrop ?? null : null)
  return displayAspect(img.width, img.height, img.rotation, usedCrop)
}

function layoutFlow(
  images: SourceImage[],
  settings: AppSettings,
  page: { width: number; height: number },
  margin: number,
  gap: number,
  forcePair: boolean,
  forceSingle: boolean,
): LayoutResult {
  const innerW = page.width - margin * 2
  const innerH = page.height - margin * 2
  const limits = readableLimits(settings.readableFloor)
  const pages: LayoutResult['pages'] = []
  const items: LayoutPlacement[] = []
  let pageIndex = 0
  let cursorY = 0
  let i = 0

  const flushPage = () => {
    const pageItems = items.filter((it) => it.pageIndex === pageIndex)
    pages.push({ index: pageIndex, items: pageItems })
    pageIndex++
    cursorY = 0
  }

  while (i < images.length) {
    const img = images[i]
    const ar = Math.max(0.12, aspectOf(img, settings))
    const next = images[i + 1]
    const nextAr = next ? Math.max(0.12, aspectOf(next, settings)) : 0

    const pairCandidate =
      !forceSingle &&
      next &&
      (forcePair || (ar < 1.38 && nextAr < 1.38))

    if (pairCandidate && next) {
      const colW = (innerW - gap) / 2
      if (colW >= limits.width) {
        const h1 = colW / ar
        const h2 = colW / nextAr
        let rowH = Math.max(h1, h2)
        const minH = Math.min(h1, h2)
        const readable = forcePair || minH >= limits.height * 0.85

        if (readable && rowH <= innerH) {
          if (cursorY > 0 && cursorY + rowH > innerH + 0.05) flushPage()
          let placedPair = false
          if (cursorY + rowH > innerH + 0.05) {
            const scale = innerH / rowH
            if (minH * scale >= limits.height * 0.85 && colW * scale >= limits.width) {
              rowH = innerH
              place(items, img.id, pageIndex, margin, margin + cursorY, colW * scale, h1 * scale)
              place(
                items,
                next.id,
                pageIndex,
                margin + colW * scale + gap,
                margin + cursorY,
                colW * scale,
                h2 * scale,
              )
              placedPair = true
            }
          } else {
            place(items, img.id, pageIndex, margin, margin + cursorY, colW, h1)
            place(
              items,
              next.id,
              pageIndex,
              margin + colW + gap,
              margin + cursorY,
              colW,
              h2,
            )
            placedPair = true
          }
          if (placedPair) {
            cursorY += rowH + gap
            i += 2
            continue
          }
        }
      }
    }

    let w = innerW
    let h = w / ar
    if (h > innerH) {
      h = innerH
      w = h * ar
    }
    if (cursorY > 0 && cursorY + h > innerH + 0.05) flushPage()
    if (cursorY + h > innerH + 0.05) {
      h = innerH
      w = Math.min(innerW, h * ar)
    }
    const x = margin + (innerW - w) / 2
    place(items, img.id, pageIndex, x, margin + cursorY, w, h)
    cursorY += h + gap
    i += 1
  }

  if (items.some((it) => it.pageIndex === pageIndex)) {
    pages.push({
      index: pageIndex,
      items: items.filter((it) => it.pageIndex === pageIndex),
    })
  }

  if (pages.length === 0) {
    pages.push({ index: 0, items: [] })
  }

  return {
    pageWidth: page.width,
    pageHeight: page.height,
    pages: balanceLastPage(pages, images, settings, page, margin, gap, limits),
  }
}

function balanceLastPage(
  pages: LayoutResult['pages'],
  images: SourceImage[],
  settings: AppSettings,
  page: { width: number; height: number },
  margin: number,
  gap: number,
  limits: { width: number; height: number },
): LayoutResult['pages'] {
  if (pages.length < 2) return pages
  const last = pages[pages.length - 1]
  const prev = pages[pages.length - 2]
  if (last.items.length !== 1 || prev.items.length < 2) return pages

  const moved = prev.items[prev.items.length - 1]
  const orphan = last.items[0]
  const byId = new Map(images.map((img) => [img.id, img]))
  const a = byId.get(moved.imageId)
  const b = byId.get(orphan.imageId)
  if (!a || !b) return pages

  const innerW = page.width - margin * 2
  const innerH = page.height - margin * 2
  const ar1 = Math.max(0.12, aspectOf(a, settings))
  const ar2 = Math.max(0.12, aspectOf(b, settings))
  const h1 = innerW / ar1
  const h2 = innerW / ar2
  const stacked =
    h1 + gap + h2 <= innerH + 0.05 &&
    h1 >= limits.height * 0.8 &&
    h2 >= limits.height * 0.8

  const nextPages = pages.map((p) => ({ ...p, items: [...p.items] }))
  const nextPrev = nextPages[nextPages.length - 2]
  const nextLast = nextPages[nextPages.length - 1]
  nextPrev.items = nextPrev.items.slice(0, -1)

  if (stacked) {
    nextLast.items = [
      {
        imageId: a.id,
        pageIndex: nextLast.index,
        x: margin,
        y: margin,
        width: innerW,
        height: h1,
      },
      {
        imageId: b.id,
        pageIndex: nextLast.index,
        x: margin,
        y: margin + h1 + gap,
        width: innerW,
        height: h2,
      },
    ]
    return nextPages
  }

  const colW = (innerW - gap) / 2
  const ph1 = colW / ar1
  const ph2 = colW / ar2
  const rowH = Math.max(ph1, ph2)
  if (colW < limits.width || rowH > innerH || Math.min(ph1, ph2) < limits.height * 0.75) {
    return pages
  }
  nextLast.items = [
    {
      imageId: a.id,
      pageIndex: nextLast.index,
      x: margin,
      y: margin,
      width: colW,
      height: ph1,
    },
    {
      imageId: b.id,
      pageIndex: nextLast.index,
      x: margin + colW + gap,
      y: margin,
      width: colW,
      height: ph2,
    },
  ]
  return nextPages
}

function layoutCustom(
  images: SourceImage[],
  settings: AppSettings,
  page: { width: number; height: number },
  margin: number,
  gap: number,
): LayoutResult {
  const n = Math.max(1, Math.min(12, settings.itemsPerPage))
  const { cols, rows } = gridFor(n, page.width >= page.height)
  const innerW = page.width - margin * 2
  const innerH = page.height - margin * 2
  const slotW = (innerW - gap * (cols - 1)) / cols
  const slotH = (innerH - gap * (rows - 1)) / rows
  const pages: LayoutResult['pages'] = []
  const items: LayoutPlacement[] = []

  images.forEach((img, index) => {
    const pageIndex = Math.floor(index / n)
    const slot = index % n
    const col = slot % cols
    const row = Math.floor(slot / cols)
    const ar = Math.max(0.12, aspectOf(img, settings))
    let w = slotW
    let h = w / ar
    if (h > slotH) {
      h = slotH
      w = h * ar
    }
    const x = margin + col * (slotW + gap) + (slotW - w) / 2
    const y = margin + row * (slotH + gap) + (slotH - h) / 2
    place(items, img.id, pageIndex, x, y, w, h)
  })

  const pageCount = Math.max(1, Math.ceil(images.length / n) || 1)
  for (let p = 0; p < pageCount; p++) {
    pages.push({
      index: p,
      items: items.filter((it) => it.pageIndex === p),
    })
  }
  return { pageWidth: page.width, pageHeight: page.height, pages }
}

function gridFor(n: number, landscape: boolean): { cols: number; rows: number } {
  if (n === 1) return { cols: 1, rows: 1 }
  if (n === 2) return landscape ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 }
  if (n === 3) return landscape ? { cols: 3, rows: 1 } : { cols: 1, rows: 3 }
  if (n === 4) return { cols: 2, rows: 2 }
  if (n === 6) return { cols: 2, rows: 3 }
  if (n === 8) return { cols: 2, rows: 4 }
  if (n === 9) return { cols: 3, rows: 3 }
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  return { cols, rows }
}

function place(
  items: LayoutPlacement[],
  imageId: string,
  pageIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  items.push({ imageId, pageIndex, x, y, width, height })
}
