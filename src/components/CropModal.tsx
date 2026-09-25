import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { CropRect, SourceImage } from '../types'
import { clampCrop } from '../lib/processing/geometry'

interface Props {
  image: SourceImage
  onClose: () => void
  onApply: (crop: CropRect | null) => void
}

export function CropModal({ image, onClose, onApply }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<CropRect>(
    image.crop ?? image.analysis?.suggestedCrop ?? { x: 0.05, y: 0.05, w: 0.9, h: 0.9 },
  )
  const drag = useRef<{ mode: string; startX: number; startY: number; crop: CropRect } | null>(
    null,
  )

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current || !imgRef.current) return
      const box = imgRef.current.getBoundingClientRect()
      const dx = (e.clientX - drag.current.startX) / box.width
      const dy = (e.clientY - drag.current.startY) / box.height
      const c = { ...drag.current.crop }
      if (drag.current.mode === 'move') {
        c.x += dx
        c.y += dy
      } else if (drag.current.mode.includes('l')) {
        c.x += dx
        c.w -= dx
      } else if (drag.current.mode.includes('r')) {
        c.w += dx
      }
      if (drag.current.mode.includes('t')) {
        c.y += dy
        c.h -= dy
      } else if (drag.current.mode.includes('b')) {
        c.h += dy
      }
      setCrop(clampCrop(c))
    }
    const up = () => {
      drag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  function start(mode: string, e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    drag.current = { mode, startX: e.clientX, startY: e.clientY, crop }
  }

  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <header>
          <h2>Crop {image.name}</h2>
          <button type="button" className="text-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="crop-stage">
          <div className="crop-frame">
          <img ref={imgRef} src={image.objectUrl} alt="" />
          <div
            className="crop-rect"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
            onPointerDown={(e) => start('move', e)}
          >
            {['tl', 'tr', 'bl', 'br', 'l', 'r', 't', 'b'].map((h) => (
              <i key={h} className={`handle ${h}`} onPointerDown={(e) => start(h, e)} />
            ))}
          </div>
          </div>
        </div>
        <footer>
          <button type="button" className="ghost" onClick={() => onApply(null)}>
            Reset
          </button>
          <button type="button" className="primary" onClick={() => onApply(crop)}>
            Apply crop
          </button>
        </footer>
      </div>
    </div>
  )
}
