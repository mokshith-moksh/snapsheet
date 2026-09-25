export function createSampleScreenshots(): File[] {
  const files: File[] = []
  files.push(raster('white-algebra.png', 1600, 900, (ctx, w, h) => {
    fill(ctx, w, h, '#f7f8fb')
    ctx.fillStyle = '#1a1d27'
    ctx.font = 'bold 54px ui-serif, Georgia, serif'
    ctx.fillText('Q3.  Solve for x', 80, 120)
    ctx.font = '42px ui-serif, Georgia, serif'
    ctx.fillText('2(x − 3) + 5 = 3x + 1', 80, 220)
    ctx.fillText('Show that x = −12 is not a root.', 80, 320)
    ctx.strokeStyle = '#c9cdd8'
    ctx.strokeRect(64, 48, w - 128, h - 96)
  }))

  files.push(raster('dark-physics.png', 1920, 1080, (ctx, w, h) => {
    fill(ctx, w, h, '#0b0d14')
    ctx.fillStyle = '#f4f6fb'
    ctx.font = 'bold 58px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText('Kirchhoff’s loop rule', 90, 140)
    ctx.font = '40px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText('Σ ε − Σ IR = 0 around a closed loop.', 90, 240)
    ctx.fillText('Find I if ε = 12 V, R1 = 4 Ω, R2 = 8 Ω.', 90, 330)
    ctx.strokeStyle = '#8b93a7'
    ctx.lineWidth = 3
    ctx.strokeRect(120, 430, 520, 280)
    ctx.fillText('ε', 340, 590)
  }))

  files.push(raster('diagram-circuit.png', 1400, 1100, (ctx, w, h) => {
    fill(ctx, w, h, '#ffffff')
    ctx.fillStyle = '#111'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('Figure 2. Series–parallel network', 48, 64)
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 6
    ctx.strokeRect(180, 180, 980, 720)
    ctx.strokeStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(180, 540)
    ctx.lineTo(1160, 540)
    ctx.stroke()
    ctx.fillStyle = '#059669'
    ctx.fillRect(420, 360, 160, 80)
    ctx.fillStyle = '#d97706'
    ctx.fillRect(760, 640, 160, 80)
  }))

  files.push(raster('photo-lab.png', 1200, 900, (ctx, w, h) => {
    const image = ctx.createImageData(w, h)
    for (let i = 0; i < image.data.length; i += 4) {
      const x = (i / 4) % w
      const y = Math.floor(i / 4 / w)
      image.data[i] = 90 + (x * 0.1 + y * 0.08) % 80
      image.data[i + 1] = 70 + (y * 0.2) % 90
      image.data[i + 2] = 60 + (x * 0.15) % 70
      image.data[i + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, h - 120, w, 120)
    ctx.fillStyle = '#fff'
    ctx.font = '32px sans-serif'
    ctx.fillText('Lab setup — do not invert', 40, h - 48)
  }))

  files.push(raster('mixed-slide.png', 1600, 1000, (ctx, w, h) => {
    fill(ctx, w, h, '#111827')
    ctx.fillStyle = '#f9fafb'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('Enzyme kinetics', 72, 100)
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(80, 200, 640, 640)
    ctx.fillStyle = '#0f172a'
    ctx.font = '28px sans-serif'
    ctx.fillText('V vs [S] curve', 120, 280)
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(140, 760)
    ctx.quadraticCurveTo(300, 240, 680, 280)
    ctx.stroke()
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '36px sans-serif'
    ctx.fillText('Identify Vmax and Km.', 780, 280)
  }))

  files.push(raster('margins-screenshot.png', 1800, 1200, (ctx, w, h) => {
    fill(ctx, w, h, '#2a2d36')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(280, 180, 1240, 840)
    ctx.fillStyle = '#111'
    ctx.font = 'bold 44px Georgia, serif'
    ctx.fillText('Question 12', 340, 280)
    ctx.font = '34px Georgia, serif'
    ctx.fillText('Differentiate y = ln(3x² + 1).', 340, 380)
  }))

  files.push(raster('portrait-phone.png', 900, 1600, (ctx, w, h) => {
    fill(ctx, w, h, '#fffdf8')
    ctx.fillStyle = '#1c1917'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('Organic chemistry', 48, 100)
    for (let i = 0; i < 8; i++) {
      ctx.font = '32px serif'
      ctx.fillText(`${i + 1}. Name the functional group.`, 48, 220 + i * 140)
    }
  }))

  files.push(raster('landscape-wide.png', 2000, 700, (ctx, w, h) => {
    fill(ctx, w, h, '#f8fafc')
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 40px sans-serif'
    ctx.fillText('Timeline of the French Revolution  —  1789 to 1799', 60, 120)
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(60, 360)
    ctx.lineTo(w - 60, 360)
    ctx.stroke()
    ;[1789, 1792, 1793, 1799].forEach((year, i) => {
      const x = 160 + i * 420
      ctx.fillRect(x, 340, 6, 40)
      ctx.fillText(String(year), x - 30, 430)
    })
  }))

  files.push(raster('hires-board.png', 3200, 1800, (ctx, w, h) => {
    fill(ctx, w, h, '#0a0a0a')
    ctx.fillStyle = '#f5f5f4'
    ctx.font = 'bold 72px sans-serif'
    ctx.fillText('High-resolution chalkboard capture', 120, 200)
    ctx.font = '48px sans-serif'
    ctx.fillText('∫ e^{−x²} dx   cannot be expressed in elementary functions.', 120, 400)
    ctx.fillText('State the Gaussian integral result.', 120, 540)
  }))

  files.push(raster('tiny-margin-white.png', 1100, 800, (ctx, w, h) => {
    fill(ctx, w, h, '#ffffff')
    ctx.fillStyle = '#111827'
    ctx.font = '36px serif'
    ctx.fillText('A fair die is rolled twice.', 40, 80)
    ctx.fillText('P(sum = 9) = ?', 40, 160)
  }))

  return files
}

function fill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
}

function raster(
  name: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): File {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  draw(ctx, width, height)
  const bytes = dataUrlToBytes(canvas.toDataURL('image/png'))
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' })
}

function dataUrlToBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const b64 = dataUrl.split(',')[1]
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
