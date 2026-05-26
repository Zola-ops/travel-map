<script setup lang="ts">
import { ref } from 'vue'
import type { JourneyCity } from '@/types'
import MapCanvas from '@/components/MapCanvas.vue'
import { TRANSPORT_OPTIONS } from '@/types'

const props = defineProps<{
  journeyName: string
  cities: JourneyCity[]
}>()

const emit = defineEmits<{
  close: []
}>()

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)

function onExport() {
  const url = mapCanvasRef.value?.exportImage()
  if (!url) return
  const link = document.createElement('a')
  link.download = `${props.journeyName || '旅程地图'}.png`
  link.href = url
  link.click()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
      <h3 class="font-title text-lg sm:text-xl text-gray-900 truncate mr-2">{{ journeyName }}</h3>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button @click="onExport"
          class="px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green rounded-xl text-xs sm:text-sm font-medium transition-all border border-brand-green/30">
          导出图片
        </button>
        <button @click="emit('close')"
          class="px-3 py-1.5 text-gray-500 hover:text-gray-900 text-xs sm:text-sm transition-colors">
          返回
        </button>
      </div>
    </div>

    <!-- Map (fills remaining space) -->
    <div class="flex-1 min-h-0">
      <MapCanvas
        ref="mapCanvasRef"
        mode="journey"
        :cities="cities"
        :show-paths="true"
      />
    </div>

    <!-- City route at bottom -->
    <div class="flex-shrink-0 text-center py-2.5 px-4 text-xs sm:text-sm text-gray-500 border-t border-gray-200 bg-gray-50">
      {{ cities.length }} 个城市 · {{ cities.map(c => c.cityName || c.label).join(' → ') }}
    </div>

    <!-- Transport legend -->
    <div class="flex-shrink-0 flex justify-center gap-3 sm:gap-4 py-2 px-4 bg-gray-50 border-t border-gray-100">
      <span v-for="opt in TRANSPORT_OPTIONS" :key="opt.value"
        class="text-xs text-gray-400 flex items-center gap-1">
        {{ opt.icon }} {{ opt.label }}
      </span>
    </div>
  </div>
</template>