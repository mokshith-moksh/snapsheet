import { useStore } from '../state/Store'

export function Header() {
  const { images, clear } = useStore()
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden>
          A4
        </span>
        <div>
          <strong>SnapSheet</strong>
          <p>Lecture screenshots → print-ready A4</p>
        </div>
      </div>
      <p className="privacy">
        Your lecture screenshots are processed on your device. Nothing is uploaded unless a feature explicitly says so.
      </p>
      {images.length > 0 && (
        <button type="button" className="text-btn" onClick={clear}>
          Start over
        </button>
      )}
    </header>
  )
}
