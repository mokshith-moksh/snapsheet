import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type PrintOptimization,
  type SourceImage,
} from '../types'
import { ingestFiles, revokeImage } from '../lib/files/ingest'
import { nextRotation } from '../lib/processing/geometry'
import type { CropRect } from '../types'
import { layoutImages } from '../lib/layout/engine'
import { clearProcessedCache } from '../lib/processing/pipeline'

const SETTINGS_KEY = 'snapsheet.settings'

interface AppState {
  images: SourceImage[]
  settings: AppSettings
  selectedId: string | null
  selectedIds: string[]
  compareIds: string[]
  processing: { active: boolean; done: number; total: number; label: string }
  toasts: { id: string; text: string }[]
  pageIndex: number
}

type Action =
  | { type: 'add'; images: SourceImage[] }
  | { type: 'remove'; id: string }
  | { type: 'bulkRemove' }
  | { type: 'removeDuplicates' }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'rotate'; id: string }
  | { type: 'bulkRotate' }
  | { type: 'crop'; id: string; crop: CropRect | null }
  | { type: 'cyclePrint'; ids: string[] }
  | { type: 'toggleCompare'; id: string }
  | { type: 'settings'; patch: Partial<AppSettings> }
  | { type: 'select'; id: string | null }
  | { type: 'selection'; ids: string[]; focusId?: string | null }
  | { type: 'progress'; active: boolean; done: number; total: number; label: string }
  | { type: 'toast'; text: string }
  | { type: 'dismiss'; id: string }
  | { type: 'page'; index: number }
  | { type: 'clear' }

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const next: AppSettings = { ...DEFAULT_SETTINGS }
    ;(Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]).forEach((key) => {
      const value = parsed[key]
      if (typeof value === typeof DEFAULT_SETTINGS[key]) {
        Object.assign(next, { [key]: value })
      }
    })
    return next
  } catch {
    return DEFAULT_SETTINGS
  }
}

const initial: AppState = {
  images: [],
  settings: DEFAULT_SETTINGS,
  selectedId: null,
  selectedIds: [],
  compareIds: [],
  processing: { active: false, done: 0, total: 0, label: '' },
  toasts: [],
  pageIndex: 0,
}

function withoutIds(ids: string[], drop: Set<string>) {
  return ids.filter((id) => !drop.has(id))
}

function dropImages(state: AppState, drop: Set<string>): AppState {
  if (!drop.size) return state
  state.images.filter((img) => drop.has(img.id)).forEach(revokeImage)
  const images = state.images.filter((img) => !drop.has(img.id))
  const selectedId = drop.has(state.selectedId ?? '') ? images[0]?.id ?? null : state.selectedId
  return {
    ...state,
    images,
    selectedId,
    selectedIds: withoutIds(state.selectedIds, drop),
    compareIds: withoutIds(state.compareIds, drop),
  }
}

function cycleMode(mode: PrintOptimization | null): PrintOptimization | null {
  if (mode === null) return 'original'
  if (mode === 'original') return 'smart'
  if (mode === 'smart') return 'ink'
  return null
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        images: [...state.images, ...action.images],
        selectedId: state.selectedId ?? action.images[0]?.id ?? null,
      }
    case 'remove':
      return dropImages(state, new Set([action.id]))
    case 'bulkRemove':
      return dropImages(state, new Set(state.selectedIds))
    case 'removeDuplicates':
      return dropImages(
        state,
        new Set(state.images.filter((img) => img.duplicateOf).map((img) => img.id)),
      )
    case 'reorder': {
      const images = [...state.images]
      const [moved] = images.splice(action.from, 1)
      if (!moved) return state
      images.splice(action.to, 0, moved)
      return { ...state, images }
    }
    case 'rotate':
      return {
        ...state,
        images: state.images.map((img) =>
          img.id === action.id ? { ...img, rotation: nextRotation(img.rotation) } : img,
        ),
      }
    case 'bulkRotate': {
      const ids = new Set(state.selectedIds)
      return {
        ...state,
        images: state.images.map((img) =>
          ids.has(img.id) ? { ...img, rotation: nextRotation(img.rotation) } : img,
        ),
      }
    }
    case 'crop':
      return {
        ...state,
        images: state.images.map((img) =>
          img.id === action.id ? { ...img, crop: action.crop } : img,
        ),
      }
    case 'cyclePrint': {
      const ids = new Set(action.ids)
      return {
        ...state,
        images: state.images.map((img) =>
          ids.has(img.id) ? { ...img, printMode: cycleMode(img.printMode) } : img,
        ),
      }
    }
    case 'toggleCompare': {
      const on = state.compareIds.includes(action.id)
      return {
        ...state,
        compareIds: on
          ? state.compareIds.filter((id) => id !== action.id)
          : [...state.compareIds, action.id],
      }
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'selection':
      return {
        ...state,
        selectedIds: action.ids,
        selectedId: action.focusId === undefined ? state.selectedId : action.focusId,
      }
    case 'progress':
      return {
        ...state,
        processing: {
          active: action.active,
          done: action.done,
          total: action.total,
          label: action.label,
        },
      }
    case 'toast':
      return {
        ...state,
        toasts: [...state.toasts, { id: crypto.randomUUID(), text: action.text }].slice(-6),
      }
    case 'dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'page':
      return { ...state, pageIndex: action.index }
    case 'clear':
      state.images.forEach(revokeImage)
      clearProcessedCache()
      return { ...initial, settings: state.settings }
    default:
      return state
  }
}

interface StoreValue extends AppState {
  layout: ReturnType<typeof layoutImages>
  addFiles: (files: File[]) => Promise<void>
  remove: (id: string) => void
  removeSelected: () => void
  removeDuplicates: () => void
  reorder: (from: number, to: number) => void
  rotate: (id: string) => void
  rotateSelected: () => void
  setCrop: (id: string, crop: CropRect | null) => void
  cyclePrint: (ids: string[]) => void
  toggleCompare: (id: string) => void
  patchSettings: (patch: Partial<AppSettings>) => void
  select: (id: string | null) => void
  setSelection: (ids: string[], focusId?: string | null) => void
  setPage: (index: number) => void
  clear: () => void
  dismiss: (id: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial, (base) => ({
    ...base,
    settings: loadSettings(),
  }))
  const imagesRef = useRef(state.images)
  imagesRef.current = state.images

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
  }, [state.settings])

  const layout = useMemo(
    () => layoutImages(state.images, state.settings),
    [state.images, state.settings],
  )

  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    dispatch({
      type: 'progress',
      active: true,
      done: 0,
      total: files.length,
      label: 'Reading screenshots…',
    })
    const result = await ingestFiles(
      files,
      imagesRef.current,
      (done, total, name) => {
        dispatch({
          type: 'progress',
          active: true,
          done,
          total,
          label: `Processing ${name}`,
        })
      },
      (image) => dispatch({ type: 'add', images: [image] }),
    )
    result.errors.forEach((text) => dispatch({ type: 'toast', text }))
    dispatch({
      type: 'progress',
      active: false,
      done: 0,
      total: 0,
      label: '',
    })
    if (result.images.length) {
      dispatch({
        type: 'toast',
        text: `Added ${result.images.length} screenshot${result.images.length === 1 ? '' : 's'}. Processed on this device.`,
      })
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && state.selectedIds.length) {
        event.preventDefault()
        dispatch({ type: 'bulkRemove' })
        return
      }
      if (!event.altKey || !state.selectedId) return
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      const index = state.images.findIndex((img) => img.id === state.selectedId)
      if (index < 0) return
      const to = event.key === 'ArrowUp' ? index - 1 : index + 1
      if (to < 0 || to >= state.images.length) return
      event.preventDefault()
      dispatch({ type: 'reorder', from: index, to })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.images, state.selectedId, state.selectedIds])

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      layout,
      addFiles,
      remove: (id) => dispatch({ type: 'remove', id }),
      removeSelected: () => dispatch({ type: 'bulkRemove' }),
      removeDuplicates: () => dispatch({ type: 'removeDuplicates' }),
      reorder: (from, to) => dispatch({ type: 'reorder', from, to }),
      rotate: (id) => dispatch({ type: 'rotate', id }),
      rotateSelected: () => dispatch({ type: 'bulkRotate' }),
      setCrop: (id, crop) => dispatch({ type: 'crop', id, crop }),
      cyclePrint: (ids) => dispatch({ type: 'cyclePrint', ids }),
      toggleCompare: (id) => dispatch({ type: 'toggleCompare', id }),
      patchSettings: (patch) => dispatch({ type: 'settings', patch }),
      select: (id) => dispatch({ type: 'select', id }),
      setSelection: (ids, focusId) => dispatch({ type: 'selection', ids, focusId }),
      setPage: (index) => dispatch({ type: 'page', index }),
      clear: () => dispatch({ type: 'clear' }),
      dismiss: (id) => dispatch({ type: 'dismiss', id }),
    }),
    [state, layout, addFiles],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('Store missing')
  return ctx
}

export function printModeLabel(mode: PrintOptimization | null, fallback: PrintOptimization): string {
  const shown = mode ?? fallback
  const name = shown === 'original' ? 'Original' : shown === 'ink' ? 'Ink-saving' : 'Smart'
  return mode ? name : `Auto · ${name}`
}
