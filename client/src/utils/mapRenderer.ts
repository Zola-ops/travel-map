import type { Point } from './animation'

// Cached GeoJSON (loaded once)
let geoJsonCache: any = null

export async function loadChinaGeoJSON(): Promise<any> {
  if (geoJsonCache) return geoJsonCache
  const resp = await fetch('/geo/china.json')
  if (!resp.ok) throw new Error('Failed to load China GeoJSON')
  geoJsonCache = await resp.json()
  return geoJsonCache
}

/**
 * Pre-render China map with a given transform (so map aligns with city coordinates).
 * The transform must be the SAME one used for city positioning.
 */
export async function preRenderChinaMapFit(
  width: number,
  height: number,
  transform: { scale: number; offsetX: number; offsetY: number },
): Promise<ImageBitmap> {
  const geoJson = await loadChinaGeoJSON()
  const offscreen = new OffscreenCanvas(width, height)
  const ctx = offscreen.getContext('2d')!
  drawChinaMapRaw(ctx as any, geoJson, transform, width, height)
  return offscreen.transferToImageBitmap()
}

/**
 * Draw China map polygons directly — used when per-frame rendering is needed.
 */
export function drawChinaMap(
  ctx: CanvasRenderingContext2D,
  geoJson: any,
  transform: { scale: number; offsetX: number; offsetY: number },
  canvasW: number,
  canvasH: number,
) {
  drawChinaMapRaw(ctx, geoJson, transform, canvasW, canvasH)
}

/**
 * Pre-render China map at full canvas (no transform) — for full-map views.
 */
export async function preRenderChinaMapFull(
  width: number,
  height: number,
): Promise<ImageBitmap> {
  const geoJson = await loadChinaGeoJSON()
  const offscreen = new OffscreenCanvas(width, height)
  const ctx = offscreen.getContext('2d')!
  drawChinaMapRaw(ctx as any, geoJson, { scale: 1, offsetX: 0, offsetY: 0 }, width, height)
  return offscreen.transferToImageBitmap()
}

// ---- Internal ----

function drawChinaMapRaw(
  ctx: CanvasRenderingContext2D,
  geoJson: any,
  transform: { scale: number; offsetX: number; offsetY: number },
  canvasW: number,
  canvasH: number,
) {
  if (!geoJson?.features) return
  ctx.save()

  for (const feature of geoJson.features) {
    const { geometry } = feature
    if (!geometry) continue

    let polygons: number[][][] = []
    if (geometry.type === 'Polygon') {
      polygons = geometry.coordinates
    } else if (geometry.type === 'MultiPolygon') {
      polygons = geometry.coordinates.flat()
    } else {
      continue
    }

    for (const ring of polygons) {
      if (ring.length < 3) continue
      ctx.beginPath()
      let firstPoint = true

      for (const coord of ring) {
        const [lng, lat] = coord
        const x = ((lng + 180) / 360) * canvasW
        const latRad = (lat * Math.PI) / 180
        const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
        const y = canvasH / 2 - (mercN / Math.PI) * (canvasH / 2)

        const tx = x * transform.scale + transform.offsetX
        const ty = y * transform.scale + transform.offsetY

        if (firstPoint) {
          ctx.moveTo(tx, ty)
          firstPoint = false
        } else {
          ctx.lineTo(tx, ty)
        }
      }

      ctx.closePath()
      ctx.fillStyle = '#e5e7eb'
      ctx.fill()
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.55)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
  ctx.restore()
}