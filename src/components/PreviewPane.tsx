import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/Store'
import { renderProcessed } from '../lib/processing/pipeline'
import type { LayoutPage, SourceImage, AppSettings } from '../types'

export function PreviewPane() {
  const { layout, images, settings, pageIndex, setPage, processing, compareIds } = useStore()
  const [zoom, setZoom] = useState(1)
  const page = layout.pages[Math.min(pageIndex, layout.pages.length - 1)] ?? layout.pages[0]

  useEffect(() => {
    if (pageIndex > layout.pages.length - 1) setPage(Math.max(0, layout.pages.length - 1))
  }, [layout.pages.length, pageIndex, setPage])

  if (!images.length) {
    return (
      <section className="preview empty-preview">
        <div className="empty-card">
          <h2>A4 preview</h2>
          <p>Add screenshots to see a print-accurate layout. Nothing leaves this browser.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="preview">
      <div className="preview-toolbar">
        <button
          type="button"
          disabled={pageIndex <= 0}
          onClick={() => setPage(pageIndex - 1)}
        >
          Previous
        </button>
        <span>
          Page {Math.min(pageIndex + 1, layout.pages.length)} of {layout.pages.length}
        </span>
        <button
          type="button"
          disabled={pageIndex >= layout.pages.length - 1}
          onClick={() => setPage(pageIndex + 1)}
        >
          Next
        </button>
        <label className="zoom">
          Zoom
          <input
            type="range"
            min={0.55}
            max={1.45}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="sheet-scroller">
        <A4Sheet
          page={page}
          layout={layout}
          images={images}
          settings={settings}
          zoom={zoom}
          busy={processing.active}
          compareIds={compareIds}
        />
      </div>
    </section>
  )
}

function A4Sheet({
  page,
  layout,
  images,
  settings,
  zoom,
  busy,
  compareIds,
}: {
  page: LayoutPage
  layout: { pageWidth: number; pageHeight: number }
  images: SourceImage[]
  settings: AppSettings
  zoom: number
  busy: boolean
  compareIds: string[]
}) {
  const urls = useProcessedUrls(page, images, settings, compareIds)
  const px = 3.2

  return (
    <div
      className="sheet-wrap"
      style={{
        width: layout.pageWidth * px * zoom,
        height: layout.pageHeight * px * zoom,
      }}
    >
      <div
        className={`sheet ${busy ? 'dim' : ''}`}
        style={{
          width: layout.pageWidth * px,
          height: layout.pageHeight * px,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {settings.registrationMarks && (
          <>
            <i className="reg tl" />
            <i className="reg tr" />
            <i className="reg bl" />
            <i className="reg br" />
          </>
        )}
        {page.items.map((item) => {
          const img = images.find((i) => i.id === item.imageId)
          const url = urls[item.imageId]
          return (
            <figure
              key={item.imageId}
              className={`placed ${settings.cuttingGuides}`}
              style={{
                left: item.x * px,
                top: item.y * px,
                width: item.width * px,
                height: item.height * px,
              }}
            >
              {url ? (
                <img src={url} alt={img?.name ?? 'Question'} />
              ) : (
                <div className="placed-wait">Preparing print view…</div>
              )}
            </figure>
          )
        })}
      </div>
    </div>
  )
}

function useProcessedUrls(
  page: LayoutPage,
  images: SourceImage[],
  settings: AppSettings,
  compareIds: string[],
) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const compareKey = compareIds.join(',')
  const sig = useMemo(
    () =>
      page.items
        .map((it) => {
          const img = images.find((i) => i.id === it.imageId)
          return img
            ? `${img.id}:${img.rotation}:${img.crop?.x}:${img.printMode}:${settings.optimization}:${settings.quality}:${settings.autoCrop}:${compareIds.includes(img.id)}`
            : it.imageId
        })
        .join('|'),
    [page.items, images, settings.optimization, settings.quality, settings.autoCrop, compareKey, compareIds],
  )

  useEffect(() => {
    let cancelled = false
    const next: Record<string, string> = {}
    ;(async () => {
      for (const item of page.items) {
        const img = images.find((i) => i.id === item.imageId)
        if (!img || img.status !== 'ready') continue
        try {
          const rendered = await renderProcessed(
            img,
            settings,
            1600,
            compareIds.includes(img.id),
          )
          if (cancelled) return
          next[item.imageId] = rendered.url
          setUrls({ ...next })
        } catch {
          /* keep placeholder */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sig, page.items, images, settings, compareIds])

  return urls
}
