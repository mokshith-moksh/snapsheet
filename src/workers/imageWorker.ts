import { classifyImage } from '../lib/analysis/classify'
import { applyPrintOptimization } from '../lib/processing/optimize'
import type { ImageAnalysis, PrintOptimization } from '../types'

export type WorkerRequest =
  | { id: number; type: 'analyze'; buffer: ArrayBuffer; width: number; height: number }
  | {
      id: number
      type: 'optimize'
      buffer: ArrayBuffer
      width: number
      height: number
      analysis: ImageAnalysis
      mode: PrintOptimization
    }

export type WorkerResponse =
  | { id: number; type: 'analyze'; analysis: ImageAnalysis }
  | { id: number; type: 'optimize'; buffer: ArrayBuffer; width: number; height: number }
  | { id: number; type: 'error'; message: string }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  try {
    if (msg.type === 'analyze') {
      const data = new ImageData(
        new Uint8ClampedArray(msg.buffer),
        msg.width,
        msg.height,
      )
      const analysis = classifyImage(data)
      const response: WorkerResponse = { id: msg.id, type: 'analyze', analysis }
      workerPost(response)
      return
    }
    if (msg.type === 'optimize') {
      const data = new ImageData(
        new Uint8ClampedArray(msg.buffer),
        msg.width,
        msg.height,
      )
      const out = applyPrintOptimization(data, msg.analysis, msg.mode)
      const response: WorkerResponse = {
        id: msg.id,
        type: 'optimize',
        buffer: out.data.buffer,
        width: out.width,
        height: out.height,
      }
      workerPost(response, [out.data.buffer])
    }
  } catch (err) {
    const response: WorkerResponse = {
      id: msg.id,
      type: 'error',
      message: err instanceof Error ? err.message : 'Processing failed.',
    }
    workerPost(response)
  }
}

function workerPost(message: WorkerResponse, transfer?: Transferable[]) {
  const scope = self as unknown as {
    postMessage: (msg: WorkerResponse, transfer?: Transferable[]) => void
  }
  if (transfer) scope.postMessage(message, transfer)
  else scope.postMessage(message)
}
