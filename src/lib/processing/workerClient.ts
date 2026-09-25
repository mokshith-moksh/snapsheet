import type { ImageAnalysis, PrintOptimization } from '../../types'
import type { WorkerRequest, WorkerResponse } from '../../workers/imageWorker'

type Pending = {
  resolve: (value: WorkerResponse) => void
  reject: (reason: Error) => void
}

const workers: Worker[] = []
const pending = new Map<number, Pending>()
let nextId = 1
let cursor = 0

function poolSize() {
  const n = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  return Math.max(1, Math.min(n, 8))
}

function getWorker(): Worker {
  if (workers.length === 0) {
    const size = poolSize()
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('../../workers/imageWorker.ts', import.meta.url), {
        type: 'module',
      })
      w.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const job = pending.get(event.data.id)
        if (!job) return
        pending.delete(event.data.id)
        if (event.data.type === 'error') job.reject(new Error(event.data.message))
        else job.resolve(event.data)
      }
      w.onerror = () => {
        /* individual jobs time out via reject on message error */
      }
      workers.push(w)
    }
  }
  const w = workers[cursor % workers.length]
  cursor++
  return w
}

type Job =
  | { type: 'analyze'; buffer: ArrayBuffer; width: number; height: number }
  | {
      type: 'optimize'
      buffer: ArrayBuffer
      width: number
      height: number
      analysis: ImageAnalysis
      mode: PrintOptimization
    }

function send(request: Job): Promise<WorkerResponse> {
  const id = nextId++
  const worker = getWorker()
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const full = { ...request, id } as WorkerRequest
    if (full.type === 'analyze' || full.type === 'optimize') {
      worker.postMessage(full, [full.buffer])
    } else {
      worker.postMessage(full)
    }
  })
}

export async function analyzeInWorker(data: ImageData): Promise<ImageAnalysis> {
  const copy = new Uint8ClampedArray(data.data)
  const res = await send({
    type: 'analyze',
    buffer: copy.buffer,
    width: data.width,
    height: data.height,
  })
  if (res.type !== 'analyze') throw new Error('Unexpected worker response.')
  return res.analysis
}

export async function optimizeInWorker(
  data: ImageData,
  analysis: ImageAnalysis,
  mode: PrintOptimization,
): Promise<ImageData> {
  if (mode === 'original') return data
  const copy = new Uint8ClampedArray(data.data)
  const res = await send({
    type: 'optimize',
    buffer: copy.buffer,
    width: data.width,
    height: data.height,
    analysis,
    mode,
  })
  if (res.type !== 'optimize') throw new Error('Unexpected worker response.')
  return new ImageData(new Uint8ClampedArray(res.buffer), res.width, res.height)
}
