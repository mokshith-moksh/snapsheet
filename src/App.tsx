import { useState } from 'react'
import { Header } from './components/Header'
import { Dropzone } from './components/Dropzone'
import { ThumbnailRail } from './components/ThumbnailRail'
import { PreviewPane } from './components/PreviewPane'
import { SettingsPanel } from './components/SettingsPanel'
import { CropModal } from './components/CropModal'
import { ProgressHud, Toasts } from './components/Chrome'
import { StoreProvider, useStore } from './state/Store'

function Workspace() {
  const { images, setCrop } = useStore()
  const [cropId, setCropId] = useState<string | null>(null)
  const cropping = images.find((img) => img.id === cropId)

  return (
    <div className="app">
      <Header />
      <Dropzone />
      <main className="workspace">
        <ThumbnailRail onCrop={setCropId} />
        <PreviewPane />
        <SettingsPanel />
      </main>
      <ProgressHud />
      <Toasts />
      {cropping && (
        <CropModal
          image={cropping}
          onClose={() => setCropId(null)}
          onApply={(crop) => {
            setCrop(cropping.id, crop)
            setCropId(null)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  )
}
