// China approximate bounding box (GCJ-02 coordinate range)
const CHINA_BOUNDS = {
  minLng: 73,
  maxLng: 135,
  minLat: 18,
  maxLat: 54,
}

export function isInChina(lng: number, lat: number): boolean {
  return (
    lng >= CHINA_BOUNDS.minLng &&
    lng <= CHINA_BOUNDS.maxLng &&
    lat >= CHINA_BOUNDS.minLat &&
    lat <= CHINA_BOUNDS.maxLat
  )
}

export function allCitiesDomestic(cities: { lng: number; lat: number }[]): boolean {
  return cities.length > 0 && cities.every((c) => isInChina(c.lng, c.lat))
}

export interface MapBounds {
  center: [number, number]
  zoom: number
}

/**
 * Compute optimal ECharts geo center + zoom to fit all cities within viewport.
 * Uses the latitude range to determine appropriate zoom level.
 */
export function computeFitBounds(
  cities: { lng: number; lat: number }[],
  aspectRatio = 1.5
): MapBounds {
  if (cities.length === 0) {
    return { center: [104.5, 36], zoom: 1.2 }
  }

  if (cities.length === 1) {
    return { center: [cities[0].lng, cities[0].lat], zoom: 6 }
  }

  const lngs = cities.map((c) => c.lng)
  const lats = cities.map((c) => c.lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const centerLng = (minLng + maxLng) / 2
  const centerLat = (minLat + maxLat) / 2

  // Add 20% padding
  const lngSpan = (maxLng - minLng) * 1.2 || 1
  const latSpan = (maxLat - minLat) * 1.2 || 1

  // Zoom formula: map shows roughly 360/2^zoom degrees of longitude
  // We solve: 360 / 2^zoom ≈ lngSpan → zoom ≈ log2(360 / lngSpan)
  const neededSpan = Math.max(lngSpan, latSpan * aspectRatio)
  const zoom = Math.round(Math.log2(360 / neededSpan) * 10) / 10
  const clampedZoom = Math.min(Math.max(zoom, 1), 10)

  return { center: [centerLng, centerLat], zoom: clampedZoom }
}