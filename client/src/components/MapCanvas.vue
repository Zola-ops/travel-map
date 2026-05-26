<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMap } from '@/composables/useMap'
import type { JourneyCity, EggCount, VisitedCity } from '@/types'
import { allCitiesDomestic } from '@/utils/geo'

const props = defineProps<{
  mode: 'journey' | 'dual' | 'anydoor'
  cities?: JourneyCity[]
  eggCounts?: EggCount[]
  showPaths?: boolean
  visitedCities?: VisitedCity[]
}>()

const emit = defineEmits<{
  cityClick: [lng: number, lat: number]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const { initMap, showCityMarkers, showPaths, showVisitedMarkers, fitBounds, flyToCity, dispose } = useMap()
const mapStatus = ref<'loading' | 'loaded' | 'error'>('loading')
const errorMsg = ref('')
let chart: any = null

async function loadGeoJSON(mapName: string) {
  const sources = [
    `/geo/${mapName}.json`,
    `https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`,
  ]

  for (const url of sources) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!resp.ok) continue
      return await resp.json()
    } catch {
      continue
    }
  }
  throw new Error('所有地图数据源加载失败，请检查网络连接')
}

async function init() {
  if (!containerRef.value) return
  mapStatus.value = 'loading'

  const validCities = (props.cities || []).filter((c) => c.cityName && c.lat && c.lng)
  // anydoor & journey modes always use domestic map; dual checks if all cities are in China
  const isDomestic = props.mode === 'anydoor' || props.mode === 'journey'
    || (validCities.length > 0 && allCitiesDomestic(validCities))

  try {
    if (isDomestic) {
      const geoJson = await loadGeoJSON('china')
      chart = initMap(containerRef.value, geoJson, 'china')
    } else {
      chart = initMap(containerRef.value) // no geo — world mode
    }
    mapStatus.value = 'loaded'

    chart.on('click', (params: any) => {
      if (params.componentType === 'geo' || params.componentType === 'series') {
        const [lng, lat] = params.data?.value || []
        if (lng !== undefined) emit('cityClick', lng, lat)
      }
    })

    // Show visited markers immediately if data exists
    if (props.mode === 'anydoor' && props.visitedCities?.length) {
      showVisitedMarkers(props.visitedCities)
    }

    updateDisplay()
  } catch (e: any) {
    mapStatus.value = 'error'
    errorMsg.value = e.message || '地图加载失败'
    console.error('Map load error:', e)
  }
}

async function retry() {
  await init()
}

onMounted(init)

onUnmounted(() => {
  dispose()
})

function updateDisplay() {
  if (!chart || mapStatus.value !== 'loaded') return

  const validCities = (props.cities || []).filter((c) => c.cityName && c.lat && c.lng)

  if ((props.mode === 'journey' || props.mode === 'dual') && validCities.length > 0) {
    showCityMarkers(validCities)
    if (props.showPaths && validCities.length >= 2) {
      showPaths(validCities)
    }
    if (validCities.length >= 1) {
      fitBounds(validCities)
    }
  } else if (props.mode === 'anydoor') {
    // AnyDoor mode shows egg counts as dots if available
  }
}

watch(
  () => [props.cities, props.showPaths, props.eggCounts, props.visitedCities],
  () => {
    updateDisplay()
  },
  { deep: true }
)

defineExpose({ flyToCity, exportImage: () => chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#f9fafb' }) })
</script>

<template>
  <div class="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-white">
    <!-- Loading -->
    <div
      v-if="mapStatus === 'loading'"
      class="absolute inset-0 flex flex-col items-center justify-center bg-white z-10"
    >
      <div class="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin mb-3" />
      <p class="text-sm text-gray-500">地图加载中...</p>
    </div>

    <!-- Error -->
    <div
      v-if="mapStatus === 'error'"
      class="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3"
    >
      <div class="text-3xl">🗺️</div>
      <p class="text-sm text-gray-500">{{ errorMsg }}</p>
      <button
        @click="retry"
        class="px-4 py-2 bg-brand-navy hover:bg-brand-navy/80 text-white rounded-xl text-sm transition-all"
      >
        重新加载
      </button>
    </div>

    <!-- Map container -->
    <div ref="containerRef" class="w-full h-full" />
  </div>
</template>