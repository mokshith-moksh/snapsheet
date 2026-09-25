import { useStore } from '../state/Store'

export function Toasts() {
  const { toasts, dismiss } = useStore()
  if (!toasts.length) return null
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} type="button" onClick={() => dismiss(t.id)}>
          {t.text}
        </button>
      ))}
    </div>
  )
}

export function ProgressHud() {
  const { processing } = useStore()
  if (!processing.active) return null
  const pct = processing.total ? Math.round((processing.done / processing.total) * 100) : 0
  return (
    <div className="hud">
      <div className="hud-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p>
        {processing.label} {processing.total ? `(${processing.done}/${processing.total})` : ''}
      </p>
    </div>
  )
}
