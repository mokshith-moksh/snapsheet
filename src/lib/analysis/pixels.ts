export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

export function sampleStats(data: ImageData, step = 1) {
  const { data: px, width, height } = data
  let n = 0
  let sumL = 0
  let sumSat = 0
  let sumL2 = 0
  let dark = 0
  let light = 0
  let highSat = 0
  let borderL = 0
  let borderN = 0
  let innerL = 0
  let innerN = 0
  let edges = 0
  let edgeSamples = 0

  const borderBand = Math.max(2, Math.round(Math.min(width, height) * 0.08))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = px[i]
      const g = px[i + 1]
      const b = px[i + 2]
      const l = luma(r, g, b)
      const s = saturation(r, g, b)
      n++
      sumL += l
      sumSat += s
      sumL2 += l * l
      if (l < 55) dark++
      if (l > 210) light++
      if (l > 40 && s > 0.32) highSat++

      const onBorder =
        x < borderBand ||
        y < borderBand ||
        x >= width - borderBand ||
        y >= height - borderBand
      if (onBorder) {
        borderL += l
        borderN++
      } else {
        innerL += l
        innerN++
      }

      if (x + 1 < width) {
        const j = (y * width + x + 1) * 4
        const l2 = luma(px[j], px[j + 1], px[j + 2])
        edgeSamples++
        if (Math.abs(l - l2) > 16) edges++
      }
    }
  }

  const meanLuma = n ? sumL / n : 0
  const variance = n ? sumL2 / n - meanLuma * meanLuma : 0

  return {
    count: n,
    meanLuma,
    variance: Math.max(0, variance),
    saturation: n ? sumSat / n : 0,
    darkRatio: n ? dark / n : 0,
    lightRatio: n ? light / n : 0,
    highSatRatio: n ? highSat / n : 0,
    borderLuma: borderN ? borderL / borderN : meanLuma,
    innerLuma: innerN ? innerL / innerN : meanLuma,
    edgeDensity: edgeSamples ? edges / edgeSamples : 0,
  }
}
