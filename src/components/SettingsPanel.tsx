import { useState } from 'react'
import { useStore } from '../state/Store'
import { generatePdf, pdfFilename } from '../lib/pdf/generate'
import { layoutImages } from '../lib/layout/engine'

export function SettingsPanel() {
  const { settings, patchSettings, images, layout } = useStore()
  const [exporting, setExporting] = useState(false)
  const [exportLabel, setExportLabel] = useState('')

  async function download() {
    if (!images.length) return
    setExporting(true)
    setExportLabel('Building A4 PDF…')
    try {
      const blob = await generatePdf(images, settings, layout, (done, total) => {
        setExportLabel(`Embedding ${done} / ${total}`)
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFilename()
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportLabel('')
      alert('The PDF could not be created. Try fewer images, or use Standard quality.')
    } finally {
      setExporting(false)
      setExportLabel('')
    }
  }

  function printPdf() {
    const pages = layoutImages(images, settings)
    void (async () => {
      try {
        setExporting(true)
        const blob = await generatePdf(images, settings, pages)
        const url = URL.createObjectURL(blob)
        const win = window.open(url, '_blank')
        if (win) {
          win.addEventListener('load', () => win.print())
        } else {
          window.location.href = url
        }
      } catch {
        alert('Printing is not available. Download the PDF instead.')
      } finally {
        setExporting(false)
      }
    })()
  }

  return (
    <aside className="settings">
      <h2>Layout & print</h2>

      <fieldset>
        <legend>Print optimization</legend>
        <Segmented
          value={settings.optimization}
          onChange={(optimization) => patchSettings({ optimization })}
          options={[
            { value: 'original', label: 'Original' },
            { value: 'smart', label: 'Smart' },
            { value: 'ink', label: 'Ink-saving' },
          ]}
        />
        <p className="hint">
          Smart turns dark lecture slides into ink-friendly pages without flattening
          photos or colored diagrams.
        </p>
      </fieldset>

      <fieldset>
        <legend>Quality</legend>
        <Segmented
          value={settings.quality}
          onChange={(quality) => patchSettings({ quality })}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'high', label: 'High' },
            { value: 'ink', label: 'Ink saving' },
          ]}
        />
      </fieldset>

      <fieldset>
        <legend>Layout</legend>
        <Segmented
          value={settings.layout}
          onChange={(layoutMode) => patchSettings({ layout: layoutMode })}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'single', label: '1 col' },
            { value: 'two', label: '2 col' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {settings.layout === 'custom' && (
          <label className="stack">
            Items per page
            <input
              type="number"
              min={1}
              max={12}
              value={settings.itemsPerPage}
              onChange={(e) =>
                patchSettings({ itemsPerPage: Number(e.target.value) || 4 })
              }
            />
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Page</legend>
        <label className="stack">
          Orientation
          <select
            value={settings.orientation}
            onChange={(e) =>
              patchSettings({ orientation: e.target.value as AppSettingsOrientation })
            }
          >
            <option value="portrait">A4 portrait</option>
            <option value="landscape">A4 landscape</option>
          </select>
        </label>
        <label className="stack">
          Margins
          <select
            value={settings.marginPreset}
            onChange={(e) =>
              patchSettings({ marginPreset: e.target.value as typeof settings.marginPreset })
            }
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {settings.marginPreset === 'custom' && (
          <label className="stack">
            Margin (mm)
            <input
              type="number"
              min={4}
              max={40}
              value={settings.customMarginMm}
              onChange={(e) =>
                patchSettings({ customMarginMm: Number(e.target.value) || 12 })
              }
            />
          </label>
        )}
        <label className="stack">
          Minimum readable size
          <select
            value={settings.readableFloor}
            onChange={(e) =>
              patchSettings({
                readableFloor: e.target.value as typeof settings.readableFloor,
              })
            }
          >
            <option value="compact">Compact</option>
            <option value="standard">Standard</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className="stack">
          Spacing
          <select
            value={settings.spacing}
            onChange={(e) =>
              patchSettings({ spacing: e.target.value as typeof settings.spacing })
            }
          >
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="roomy">Roomy</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Cutting guides</legend>
        <Segmented
          value={settings.cuttingGuides}
          onChange={(cuttingGuides) => patchSettings({ cuttingGuides })}
          options={[
            { value: 'none', label: 'None' },
            { value: 'border', label: 'Light border' },
            { value: 'dashed', label: 'Dashed' },
          ]}
        />
      </fieldset>

      <label className="check">
        <input
          type="checkbox"
          checked={settings.registrationMarks}
          onChange={(e) => patchSettings({ registrationMarks: e.target.checked })}
        />
        Corner marks for straight cuts
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={settings.autoCrop}
          onChange={(e) => patchSettings({ autoCrop: e.target.checked })}
        />
        Trim obvious outer margins
      </label>

      <div className="export">
        <button
          type="button"
          className="primary block"
          disabled={!images.length || exporting}
          onClick={() => void download()}
        >
          {exporting ? exportLabel || 'Working…' : 'Download A4 PDF'}
        </button>
        <button
          type="button"
          className="ghost block"
          disabled={!images.length || exporting}
          onClick={printPdf}
        >
          Print
        </button>
      </div>
    </aside>
  )
}

type AppSettingsOrientation = 'portrait' | 'landscape'

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? 'on' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
