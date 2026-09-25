import { useRef, useState, type MouseEvent } from 'react'
import { kindLabel } from '../lib/analysis/classify'
import { printModeLabel, useStore } from '../state/Store'

interface Props {
  onCrop: (id: string) => void
}

const ROW = 128

export function ThumbnailRail({ onCrop }: Props) {
  const {
    images,
    settings,
    selectedId,
    selectedIds,
    compareIds,
    setSelection,
    remove,
    rotate,
    reorder,
    cyclePrint,
    toggleCompare,
    removeSelected,
    rotateSelected,
    removeDuplicates,
  } = useStore()
  const anchor = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(640)

  if (!images.length) return null

  const selected = new Set(selectedIds)
  const duplicates = images.filter((img) => img.duplicateOf).length
  const start = Math.max(0, Math.floor(scrollTop / ROW) - 4)
  const end = Math.min(images.length, Math.ceil((scrollTop + viewport) / ROW) + 4)
  const visible = images.slice(start, end)

  function choose(index: number, event: MouseEvent) {
    const id = images[index]?.id
    if (!id) return
    if (event.shiftKey) {
      const from = Math.min(anchor.current, index)
      const to = Math.max(anchor.current, index)
      setSelection(
        images.slice(from, to + 1).map((img) => img.id),
        id,
      )
      return
    }
    if (event.metaKey || event.ctrlKey) {
      const next = selected.has(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id]
      anchor.current = index
      setSelection(next, id)
      return
    }
    anchor.current = index
    setSelection([id], id)
  }

  return (
    <aside className="rail">
      <div className="rail-head">
        <h2>Screenshots</h2>
        <span>{images.length}</span>
      </div>
      {selectedIds.length > 1 && (
        <div className="bulk-bar">
          <span>{selectedIds.length} selected</span>
          <button type="button" onClick={() => rotateSelected()}>
            Rotate
          </button>
          <button type="button" onClick={() => cyclePrint(selectedIds)}>
            Print mode
          </button>
          <button type="button" onClick={() => removeSelected()}>
            Delete
          </button>
        </div>
      )}
      {duplicates > 0 && (
        <button type="button" className="dup-banner" onClick={removeDuplicates}>
          Remove {duplicates} duplicate{duplicates === 1 ? '' : 's'}
        </button>
      )}
      <div
        className="thumbs-scroll"
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget
          setScrollTop(el.scrollTop)
          if (el.clientHeight !== viewport) setViewport(el.clientHeight)
        }}
      >
        <ul className="thumbs" style={{ height: images.length * ROW }}>
          {visible.map((img, offset) => {
            const index = start + offset
            const on = selected.has(img.id) || selectedId === img.id
            return (
              <li
                key={img.id}
                className={on ? 'selected' : ''}
                style={{ top: index * ROW }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(index))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = Number(e.dataTransfer.getData('text/plain'))
                  if (!Number.isNaN(from) && from !== index) reorder(from, index)
                }}
              >
                <button
                  type="button"
                  className="thumb-hit"
                  aria-label={`Select ${img.name}`}
                  onClick={(event) => choose(index, event)}
                >
                  <span className="seq">{index + 1}</span>
                  <img
                    src={img.thumbUrl}
                    alt=""
                    style={{ transform: `rotate(${img.rotation}deg)` }}
                  />
                </button>
                <div className="thumb-meta">
                  <strong title={img.name}>{img.name}</strong>
                  {img.analysis && <em>{kindLabel(img.analysis.kind)}</em>}
                  <em className="mode-badge">
                    {printModeLabel(img.printMode, settings.optimization)}
                  </em>
                  {img.duplicateOf && <em className="dup-badge">Duplicate</em>}
                </div>
                <div className="thumb-actions">
                  <span className="drag" title="Drag to reorder" aria-hidden>
                    ⋮⋮
                  </span>
                  <button type="button" onClick={() => rotate(img.id)} aria-label={`Rotate ${img.name}`}>
                    ↻
                  </button>
                  <button type="button" onClick={() => onCrop(img.id)} aria-label={`Crop ${img.name}`}>
                    Crop
                  </button>
                  <button
                    type="button"
                    onClick={() => cyclePrint([img.id])}
                    aria-label={`Cycle print mode for ${img.name}`}
                    title="Cycle Original, Smart, and Ink-saving"
                  >
                    Mode
                  </button>
                  <button
                    type="button"
                    className={compareIds.includes(img.id) ? 'on' : ''}
                    onClick={() => toggleCompare(img.id)}
                    aria-pressed={compareIds.includes(img.id)}
                    aria-label={
                      compareIds.includes(img.id)
                        ? `Show print version of ${img.name}`
                        : `Show original of ${img.name}`
                    }
                  >
                    {compareIds.includes(img.id) ? 'After' : 'Before'}
                  </button>
                  <button type="button" onClick={() => remove(img.id)} aria-label={`Delete ${img.name}`}>
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="hint rail-hint">
        Shift-click to select a range. Alt+arrow moves the selected screenshot. Delete removes the selection.
      </p>
    </aside>
  )
}
