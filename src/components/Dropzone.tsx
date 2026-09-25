import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../state/Store'
import { ACCEPTED_EXT } from '../types'
import { createSampleScreenshots } from '../lib/files/samples'

export function Dropzone() {
  const { addFiles, images } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = useCallback(
    async (list: FileList | File[]) => {
      await addFiles(Array.from(list))
    },
    [addFiles],
  )

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files: File[] = []
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (!item.type.startsWith('image/')) continue
        const file = item.getAsFile()
        if (!file) continue
        const name = file.name && file.name !== 'image.png' ? file.name : `pasted-${Date.now()}.png`
        files.push(new File([file], name, { type: file.type || 'image/png' }))
      }
      if (!files.length) return
      event.preventDefault()
      void take(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [take])

  return (
    <section
      className={`dropzone ${over ? 'over' : ''} ${images.length ? 'compact' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (e.dataTransfer.files.length) void take(e.dataTransfer.files)
      }}
    >
      <h1>Drop your lecture screenshots here</h1>
      <p>
        JPG, PNG, WEBP{images.length ? '' : ', and HEIC where the browser allows it'}.
        Paste a screenshot from the clipboard. Nothing is uploaded.
      </p>
      <div className="drop-actions">
        <button type="button" className="primary" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        {!images.length && (
          <button
            type="button"
            className="ghost"
            onClick={() => void take(createSampleScreenshots())}
          >
            Try sample slides
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_EXT, 'image/*'].join(',')}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void take(e.target.files)
          e.target.value = ''
        }}
      />
    </section>
  )
}
