import { ref, computed } from 'vue'
import type { VisitedCity } from '@/types'

const STORAGE_KEY = 'travel_map_visited'

// Reactive shared state
const visitedCities = ref<VisitedCity[]>(loadFromStorage())

function loadFromStorage(): VisitedCity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(cities: VisitedCity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cities))
}

export function useVisitedCities() {
  const manualCities = computed(() =>
    visitedCities.value.filter((c) => c.source === 'manual')
  )
  const anydoorCities = computed(() =>
    visitedCities.value.filter((c) => c.source === 'anydoor')
  )

  /** Mark a city as manually visited */
  function markManual(cityName: string, lat: number, lng: number) {
    const exists = visitedCities.value.find(
      (c) => c.cityName === cityName
    )
    if (exists) return // already marked

    visitedCities.value = [
      ...visitedCities.value,
      {
        cityName,
        lat,
        lng,
        source: 'manual',
        visitedAt: new Date().toISOString(),
      },
    ]
    saveToStorage(visitedCities.value)
  }

  /** Mark a city as visited via 任意门 */
  function markAnydoor(cityName: string, lat: number, lng: number) {
    // If already manual, skip (manual has higher priority)
    const existsManual = visitedCities.value.find(
      (c) => c.cityName === cityName && c.source === 'manual'
    )
    if (existsManual) return

    // If already anydoor-marked, skip
    const existsAnydoor = visitedCities.value.find(
      (c) => c.cityName === cityName && c.source === 'anydoor'
    )
    if (existsAnydoor) return

    visitedCities.value = [
      ...visitedCities.value,
      {
        cityName,
        lat,
        lng,
        source: 'anydoor',
        visitedAt: new Date().toISOString(),
      },
    ]
    saveToStorage(visitedCities.value)
  }

  /** Remove a city from visited list */
  function unmark(cityName: string) {
    visitedCities.value = visitedCities.value.filter(
      (c) => c.cityName !== cityName
    )
    saveToStorage(visitedCities.value)
  }

  /** Check if a city is marked */
  function isMarked(cityName: string): VisitedCity | undefined {
    return visitedCities.value.find((c) => c.cityName === cityName)
  }

  return {
    visitedCities,
    manualCities,
    anydoorCities,
    markManual,
    markAnydoor,
    unmark,
    isMarked,
  }
}