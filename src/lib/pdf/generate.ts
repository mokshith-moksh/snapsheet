import { jsPDF } from 'jspdf'
import type { AppSettings, LayoutResult, SourceImage } from '../../types'
import { renderProcessed } from '../processing/pipeline'
import { processMaxEdge } from '../processing/optimize'

export async function generatePdf(
  images: SourceImage[],
  settings: AppSettings,
  layout: LayoutResult,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: settings.orientation,
    compress: true,
  })

  const byId = new Map(images.map((img) => [img.id, img]))
  const total = layout.pages.reduce((n, p) => n + p.items.length, 0) || 1
  let done = 0

  for (let p = 0; p < layout.pages.length; p++) {
    if (p > 0) pdf.addPage('a4', settings.orientation)
    const page = layout.pages[p]

    for (const item of page.items) {
      const image = byId.get(item.imageId)
      if (!image || image.status !== 'ready') continue
      const rendered = await renderProcessed(image, settings, processMaxEdge(settings.quality))
      const dataUrl = await blobToDataUrl(rendered.blob)
      pdf.addImage(dataUrl, 'JPEG', item.x, item.y, item.width, item.height, undefined, 'FAST')
      drawGuides(pdf, settings, item.x, item.y, item.width, item.height)
      done++
      onProgress?.(done, total)
    }
    if (settings.registrationMarks) drawRegistrationMarks(pdf)
  }

  return pdf.output('blob')
}

function drawGuides(
  pdf: jsPDF,
  settings: AppSettings,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (settings.cuttingGuides === 'none') return
  pdf.setDrawColor(180, 176, 168)
  pdf.setLineWidth(0.15)
  if (settings.cuttingGuides === 'dashed') {
    pdf.setLineDashPattern([1.2, 1.1], 0)
    pdf.rect(x - 0.6, y - 0.6, w + 1.2, h + 1.2)
    pdf.setLineDashPattern([], 0)
  } else {
    pdf.setDrawColor(210, 204, 194)
    pdf.rect(x, y, w, h)
  }
}

function drawRegistrationMarks(pdf: jsPDF) {
  const w = pdf.internal.pageSize.getWidth()
  const h = pdf.internal.pageSize.getHeight()
  const inset = 5
  const len = 3.5
  pdf.setDrawColor(40, 40, 40)
  pdf.setLineWidth(0.25)
  const corners: Array<[number, number, number, number]> = [
    [inset, inset, 1, 1],
    [w - inset, inset, -1, 1],
    [inset, h - inset, 1, -1],
    [w - inset, h - inset, -1, -1],
  ]
  for (const [x, y, sx, sy] of corners) {
    pdf.line(x, y, x + len * sx, y)
    pdf.line(x, y, x, y + len * sy)
  }
}

export function pdfFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `lecture-notes-${y}-${m}-${d}.pdf`
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not encode an image for the PDF.'))
    reader.readAsDataURL(blob)
  })
}
