import type { JourneyCity } from '@/types'
import { TRANSPORT_OPTIONS } from '@/types'

export interface Point {
  x: number
  y: number
}

// Convert geo coordinates to canvas pixel coordinates (Mercator projection)
export function geoToPixel(lng: number, lat: number, canvasW: number, canvasH: number): Point {
  const x = ((lng + 180) / 360) * canvasW
  const latRad = (lat * Math.PI) / 180
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
  const y = canvasH / 2 - (mercN / Math.PI) * (canvasH / 2)
  return { x, y }
}

// Generate quadratic Bezier curve points between two cities
// Arc height proportional to distance for natural look
export function buildPathPoints(from: Point, to: Point, numPoints: number = 100): Point[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Control point offset perpendicular to the line for a gentle arc
  const arcHeight = Math.min(dist * 0.15, 40)
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  const perpX = -dy / (dist || 1)
  const perpY = dx / (dist || 1)
  const cpX = midX + perpX * arcHeight
  const cpY = midY + perpY * arcHeight

  const points: Point[] = []
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const ti = 1 - t
    points.push({
      x: ti * ti * from.x + 2 * ti * t * cpX + t * t * to.x,
      y: ti * ti * from.y + 2 * ti * t * cpY + t * t * to.y,
    })
  }
  return points
}

// Compute scale and offset to fit all pixel cities in the canvas with padding
export function computeFitTransform(
  pixelCities: Point[],
  canvasW: number,
  canvasH: number,
  padding: number = 60
): { scale: number; offsetX: number; offsetY: number } {
  if (pixelCities.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 }

  const xs = pixelCities.map((p) => p.x)
  const ys = pixelCities.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const availW = canvasW - padding * 2
  const availH = canvasH - padding * 2
  const dataW = maxX - minX || 1
  const dataH = maxY - minY || 1

  const scale = Math.min(availW / dataW, availH / dataH, 2.5)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return {
    scale,
    offsetX: canvasW / 2 - centerX * scale,
    offsetY: canvasH / 2 - centerY * scale,
  }
}

// Apply transform to a point
export function transformPoint(p: Point, t: { scale: number; offsetX: number; offsetY: number }): Point {
  return {
    x: p.x * t.scale + t.offsetX,
    y: p.y * t.scale + t.offsetY,
  }
}

// Get transport icon as text for canvas rendering
export function getTransportEmoji(transport: JourneyCity['transport']): string {
  const opt = TRANSPORT_OPTIONS.find((o) => o.value === transport)
  return opt?.icon || '✈️'
}

// Get transport label
export function getTransportLabel(transport: JourneyCity['transport']): string {
  const opt = TRANSPORT_OPTIONS.find((o) => o.value === transport)
  return opt?.label || '飞机'
}

// Get transport color
export function getTransportColor(transport: JourneyCity['transport']): string {
  const opt = TRANSPORT_OPTIONS.find((o) => o.value === transport)
  return opt?.color || '#4a90e2'
}

// Ease in-out cubic
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}