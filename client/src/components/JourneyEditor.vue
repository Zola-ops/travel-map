<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { JourneyCity, City } from '@/types'
import { TRANSPORT_OPTIONS } from '@/types'
import { useJourney } from '@/composables/useJourney'
import MapCanvas from './MapCanvas.vue'
import CityPicker from './CityPicker.vue'
import { allCities } from '@/data/cities'

const props = defineProps<{
  initialCities?: JourneyCity[]
  journeyName?: string
}>()

const emit = defineEmits<{
  save: [name: string, cities: JourneyCity[]]
  preview: [cities: JourneyCity[]]
  back: []
}>()

const { searchCities } = useJourney()

const name = ref(props.journeyName || '')
const cities = ref<JourneyCity[]>(
  (props.initialCities || []).map((c, i) => ({
    ...c,
    sortOrder: i + 1,
    transport: c.transport || 'plane',
  }))
)
const searchQuery = ref('')
const searchResults = ref<City[]>([])
const fillingIndex = ref(-1) // -1 = adding new, >=0 = filling an existing empty node
const mapRef = ref<InstanceType<typeof MapCanvas> | null>(null)
const showCityPicker = ref(false)

// Client-side search from local city data (330+ cities)
function localSearch(q: string): City[] {
  if (!q.trim()) return []
  const lower = q.toLowerCase()
  return allCities
    .filter(c => c.name.toLowerCase().includes(lower))
    .slice(0, 20)
    .map(c => ({
      id: 0,
      cityName: c.name,
      lat: c.lat,
      lng: c.lng,
      country: c.province,
      level: 'city',
    }))
}

// Debounced search — tries local first, falls back to API
let searchTimer: ReturnType<typeof setTimeout>
function onSearchInput(q: string) {
  searchQuery.value = q
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (q.length < 1) {
      searchResults.value = []
      return
    }
    // Use client-side data for instant results
    const local = localSearch(q)
    if (local.length > 0) {
      searchResults.value = local
    } else {
      searchResults.value = await searchCities(q)
    }
  }, 150)
}

function onCityPickerSelect(city: { cityName: string; lat: number; lng: number }) {
  selectCity({
    id: 0,
    cityName: city.cityName,
    lat: city.lat,
    lng: city.lng,
    country: '中国',
    level: 'city',
  })
  showCityPicker.value = false
}

function startFillCity(index: number) {
  fillingIndex.value = index
  searchQuery.value = ''
  searchResults.value = []
}

function selectCity(city: City) {
  // Auto-target first empty placeholder if nothing explicitly selected
  if (fillingIndex.value === -1) {
    const firstEmpty = cities.value.findIndex(c => !c.cityName)
    if (firstEmpty >= 0) {
      fillingIndex.value = firstEmpty
    }
  }

  if (fillingIndex.value >= 0 && fillingIndex.value < cities.value.length) {
    // Fill existing placeholder node
    cities.value[fillingIndex.value].cityName = city.cityName
    cities.value[fillingIndex.value].lat = city.lat
    cities.value[fillingIndex.value].lng = city.lng
  } else {
    // Add new city at the end
    const prevTransport = cities.value.length > 0
      ? cities.value[cities.value.length - 1].transport
      : 'plane'
    cities.value.push({
      cityName: city.cityName,
      lat: city.lat,
      lng: city.lng,
      sortOrder: cities.value.length + 1,
      transport: prevTransport,
    })
  }
  searchQuery.value = ''
  searchResults.value = []
  fillingIndex.value = -1

  if (mapRef.value) {
    mapRef.value.flyToCity(city.lng, city.lat)
  }
}

function removeCity(index: number) {
  cities.value.splice(index, 1)
  cities.value.forEach((c, i) => (c.sortOrder = i + 1))
}

function setTransport(index: number, transport: JourneyCity['transport']) {
  if (index < cities.value.length) {
    cities.value[index].transport = transport
  }
}

// Filter to only filled cities for preview/export
const filledCities = computed(() => cities.value.filter(c => c.cityName && c.lat && c.lng))

function handlePreview() {
  if (filledCities.value.length < 2) return
  emit('preview', filledCities.value)
}

function handleSave() {
  if (!name.value || filledCities.value.length < 2) return
  emit('save', name.value, filledCities.value)
}

const canSave = computed(() => name.value && filledCities.value.length >= 2)
const canPreview = computed(() => filledCities.value.length >= 2)
</script>

<template>
  <div class="h-full flex flex-col lg:flex-row gap-4 p-4">
    <!-- Left: Editor panel -->
    <div class="lg:w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <button @click="emit('back')" class="text-gray-500 hover:text-gray-900 text-sm transition-colors">&larr; 返回</button>
        <h3 class="font-title text-xl text-gray-900">编辑旅程</h3>
      </div>

      <!-- Journey name -->
      <input
        v-model="name"
        placeholder="给你的旅程起个名字..."
        class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange text-sm transition-colors"
      />

      <!-- City search area -->
      <div class="relative">
        <div class="flex items-center gap-2">
          <div class="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus-within:border-brand-sky transition-colors">
            <span class="text-gray-500 text-sm">🔍</span>
            <input
              v-model="searchQuery"
              @input="onSearchInput(($event.target as HTMLInputElement).value)"
              :placeholder="fillingIndex >= 0 ? `正在填充「${cities[fillingIndex]?.label || '节点'}」...` : '搜索城市添加...'"
              class="flex-1 bg-transparent text-gray-900 text-sm placeholder-gray-400 focus:outline-none"
            />
            <button
              v-if="fillingIndex >= 0"
              @click="fillingIndex = -1"
              class="text-xs text-gray-500 hover:text-gray-900"
            >
              取消
            </button>
          </div>
          <button
            @click="showCityPicker = true"
            class="px-3 py-2 bg-gray-50 border border-gray-200 hover:border-brand-orange rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all flex-shrink-0"
            title="按省份选择城市"
          >
            📋
          </button>
        </div>

        <!-- Search results dropdown -->
        <div
          v-if="searchResults.length"
          class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto shadow-sm"
        >
          <button
            v-for="city in searchResults"
            :key="city.id"
            @click="selectCity(city)"
            class="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-between"
          >
            <span>{{ city.cityName }}</span>
            <span class="text-xs text-gray-500">{{ city.country }}</span>
          </button>
        </div>
      </div>

      <!-- City list -->
      <div class="flex flex-col gap-2">
        <div class="text-xs text-gray-500 flex items-center justify-between">
          <span>城市节点 ({{ filledCities.length }}/{{ cities.length }} 已填写)</span>
          <button
            @click="startFillCity(-1)"
            class="text-brand-sky hover:text-brand-sky/80"
          >
            + 添加一站
          </button>
        </div>

        <template v-for="(city, i) in cities" :key="i">
          <!-- City node -->
          <div
            class="flex items-center gap-2 bg-gray-50/80 rounded-xl p-3 group transition-all hover:bg-gray-100"
            :class="{
              'border border-dashed border-gray-300': !city.cityName,
              'border border-transparent': !!city.cityName,
              'border-brand-sky/50': fillingIndex === i,
            }"
          >
            <!-- Index -->
            <span
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              :class="city.cityName ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-500'"
            >
              {{ i + 1 }}
            </span>

            <!-- City name or placeholder -->
            <button
              v-if="!city.cityName"
              @click="startFillCity(i)"
              class="flex-1 text-left text-sm text-gray-500 hover:text-brand-sky transition-colors py-1"
            >
              {{ city.label || '点击搜索选择城市' }}
            </button>
            <span v-else class="flex-1 text-sm text-gray-900 truncate">
              {{ city.cityName }}
              <span v-if="city.label" class="text-xs text-gray-500 ml-1">({{ city.label }})</span>
            </span>

            <!-- End label for last city -->
            <span v-if="city.cityName && i === cities.length - 1" class="text-xs text-brand-orange px-2 flex-shrink-0">终点</span>

            <!-- Delete -->
            <button
              @click="removeCity(i)"
              class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <!-- Transport selector between cities -->
          <div
            v-if="i < cities.length - 1"
            class="flex items-center justify-center gap-2 py-0.5"
          >
            <div class="w-0.5 h-4 bg-gray-100 rounded-full" />
            <select
              :value="city.transport"
              @change="setTransport(i, ($event.target as HTMLSelectElement).value as any)"
              class="appearance-none bg-gray-50 border border-gray-200 hover:border-gray-400 rounded-lg px-2.5 py-1 text-xs text-gray-600 cursor-pointer transition-colors text-center"
            >
              <option v-for="opt in TRANSPORT_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.icon }} {{ opt.label }}
              </option>
            </select>
            <div class="w-0.5 h-4 bg-gray-100 rounded-full" />
          </div>
        </template>

        <!-- Empty state -->
        <div v-if="!cities.length" class="text-center py-8">
          <p class="text-sm text-gray-500">在上方搜索框中搜索城市来添加节点</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 mt-auto pt-4 border-t border-gray-200">
        <button
          @click="handleSave"
          :disabled="!canSave"
          class="flex-1 bg-brand-navy hover:bg-brand-navy/80 disabled:bg-gray-100 disabled:text-gray-500 text-white rounded-xl py-2.5 font-medium text-sm transition-all"
        >
          保存旅程
        </button>
        <button
          @click="handlePreview"
          :disabled="!canPreview"
          class="flex-1 bg-brand-orange hover:bg-brand-orange/80 disabled:bg-gray-100 disabled:text-gray-500 text-white rounded-xl py-2.5 font-medium text-sm transition-all"
        >
          预览动画
        </button>
      </div>
    </div>

    <!-- Right: Map -->
    <div class="flex-1 min-h-0">
      <MapCanvas
        ref="mapRef"
        mode="journey"
        :cities="filledCities"
        :show-paths="true"
      />
    </div>
  </div>

  <!-- City Picker Modal -->
  <Teleport to="body">
    <div
      v-if="showCityPicker"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="showCityPicker = false"
    >
      <div class="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl h-[70vh] mx-4 overflow-hidden shadow-xl flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">选择城市</h3>
          <button @click="showCityPicker = false" class="text-gray-500 hover:text-gray-900 text-xl transition-colors">&times;</button>
        </div>
        <CityPicker
          @select="onCityPickerSelect"
          @close="showCityPicker = false"
        />
      </div>
    </div>
  </Teleport>
</template>