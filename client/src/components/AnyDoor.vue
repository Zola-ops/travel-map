<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import gsap from 'gsap'
import { useEggs } from '@/composables/useEggs'
import { useVisitedCities } from '@/composables/useVisitedCities'
import MapCanvas from '@/components/MapCanvas.vue'
import EggCard from '@/components/EggCard.vue'
import { allCities } from '@/data/cities'

const { eggs, eggCounts, fetchEggs, fetchEggCounts, submitEgg } = useEggs()
const { visitedCities, manualCities, anydoorCities, markManual, markAnydoor, unmark } = useVisitedCities()

const currentCity = ref('')
const showEggs = ref(false)
const isRandoming = ref(false)
const doorRef = ref<HTMLDivElement | null>(null)
const cityNameRef = ref<HTMLDivElement | null>(null)
const searchQuery = ref('')
const searchResults = ref<{ name: string; lat: number; lng: number }[]>([])
const showManualList = ref(false)

// Build city pool
const worldCities = [
  '东京', '巴黎', '纽约', '伦敦', '悉尼', '罗马', '曼谷',
  '新加坡', '迪拜', '巴塞罗那', '伊斯坦布尔', '清迈',
]
const cityPool = computed(() => [
  ...allCities.map(c => c.name),
  ...worldCities,
])

onMounted(() => {
  fetchEggCounts()
})

// Find city lng/lat by name
function findCityLatLng(name: string): { lat: number; lng: number } | null {
  const found = allCities.find(c => c.name === name)
  if (found) return { lat: found.lat, lng: found.lng }
  return null
}

// Search for city to manually mark
function onSearch() {
  const q = searchQuery.value.trim()
  if (!q) { searchResults.value = []; return }
  const lower = q.toLowerCase()
  searchResults.value = allCities
    .filter(c => c.name.toLowerCase().includes(lower))
    .slice(0, 8)
    .map(c => ({ name: c.name, lat: c.lat, lng: c.lng }))
}

function addManualCity(name: string, lat: number, lng: number) {
  markManual(name, lat, lng)
  searchQuery.value = ''
  searchResults.value = []
}

async function randomTeleport() {
  isRandoming.value = true
  showEggs.value = false

  await nextTick()
  if (doorRef.value) {
    const doorTl = gsap.timeline()
    doorTl.to(doorRef.value, { scale: 1.1, duration: 0.15, ease: 'power2.out' })
      .to(doorRef.value, { scale: 0.95, duration: 0.1, ease: 'power2.in' })
      .to(doorRef.value, { scale: 1.2, duration: 0.2, ease: 'back.out(2)' })
      .to(doorRef.value, { scale: 0, opacity: 0, rotation: 180, duration: 0.4, ease: 'power3.in' })
    await doorTl.play()
  }

  const pool = cityPool.value
  const city = pool[Math.floor(Math.random() * pool.length)]
  currentCity.value = city

  // Auto-mark as anydoor-visited
  const coords = findCityLatLng(city)
  if (coords) markAnydoor(city, coords.lat, coords.lng)

  await fetchEggs(city)

  await nextTick()
  if (cityNameRef.value) {
    gsap.fromTo(cityNameRef.value,
      { scale: 0, opacity: 0, rotation: -30 },
      { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' }
    )
  }
  if (doorRef.value) {
    gsap.to(doorRef.value, { scale: 1, opacity: 1, rotation: 0, duration: 0.3, ease: 'power2.out' })
  }

  showEggs.value = true
  isRandoming.value = false
}

async function onEggSubmitted() {
  await fetchEggs(currentCity.value)
  await fetchEggCounts()
}

function closeEggs() {
  showEggs.value = false
  currentCity.value = ''
}
</script>

<template>
  <div class="h-full flex flex-col lg:flex-row gap-4 p-4">
    <!-- Left: Controls -->
    <div class="lg:w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
      <h2 class="font-title text-2xl text-gray-900">个人足迹</h2>
      <p class="text-sm text-gray-500">标记你去过的城市，或通过任意门探索新城市</p>

      <!-- Manual city marking -->
      <div class="bg-white rounded-2xl p-4 border border-gray-200">
        <p class="text-sm font-medium text-gray-700 mb-2">标记到访城市</p>
        <div class="relative">
          <input
            v-model="searchQuery"
            @input="onSearch"
            placeholder="搜索城市..."
            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
          <!-- Search results -->
          <div v-if="searchResults.length" class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-md z-20 max-h-48 overflow-y-auto">
            <button
              v-for="city in searchResults" :key="city.name"
              @click="addManualCity(city.name, city.lat, city.lng)"
              class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {{ city.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Color legend -->
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-[#7ed321] border border-white shadow-sm"></span>
          <span class="text-gray-500">已到访</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-[#4a90e2] border border-white shadow-sm"></span>
          <span class="text-gray-500">任意门</span>
        </div>
      </div>

      <!-- Visited cities list -->
      <div v-if="visitedCities.length" class="bg-white rounded-2xl p-4 border border-gray-200">
        <button @click="showManualList = !showManualList" class="w-full flex items-center justify-between text-sm">
          <span class="font-medium text-gray-700">已标记 {{ visitedCities.length }} 个城市</span>
          <span class="text-gray-400 text-xs">{{ showManualList ? '收起' : '展开' }}</span>
        </button>
        <div v-if="showManualList" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="city in visitedCities" :key="city.cityName"
            @click="unmark(city.cityName)"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer transition-colors"
            :class="city.source === 'manual' ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-500' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-red-50 hover:text-red-500'"
            :title="'点击移除'"
          >
            {{ city.cityName }}
            <span class="opacity-50">×</span>
          </span>
        </div>
      </div>

      <!-- Door animation area -->
      <div class="relative bg-brand-cream rounded-2xl p-8 text-center min-h-[180px] flex flex-col items-center justify-center overflow-hidden border border-gray-100">
        <h3 class="text-xs text-gray-400 uppercase tracking-wider mb-3">任意门</h3>
        <div ref="doorRef" class="text-6xl transition-transform">
          {{ isRandoming ? '🚪' : currentCity ? '📍' : '🚪' }}
        </div>

        <div v-if="isRandoming" class="mt-4">
          <p class="text-brand-orange animate-pulse text-sm">正在开启任意门...</p>
          <div class="flex justify-center gap-1 mt-3">
            <span v-for="i in 3" :key="i" class="w-2 h-2 rounded-full bg-brand-orange" :style="{ animationDelay: `${i * 0.2}s` }" style="animation: bounce 0.6s infinite" />
          </div>
        </div>

        <div v-else-if="currentCity">
          <div ref="cityNameRef" class="text-2xl text-gray-900 font-bold mt-4">{{ currentCity }}</div>
        </div>

        <p v-else class="text-gray-500 mt-4 text-sm">随机传送到一个城市</p>
      </div>

      <button
        @click="randomTeleport"
        :disabled="isRandoming"
        class="w-full py-4 bg-brand-orange hover:bg-brand-orange/80 disabled:bg-gray-100 disabled:text-gray-600 text-white rounded-xl font-bold text-lg transition-all shadow-sm shadow-brand-orange/10 hover:shadow-brand-orange/20 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {{ isRandoming ? '传送中...' : '打开任意门' }}
      </button>
    </div>

    <!-- Right: Map -->
    <div class="flex-1 min-h-0">
      <MapCanvas mode="anydoor" :egg-counts="eggCounts" :visited-cities="visitedCities" />
    </div>

    <!-- Egg card overlay -->
    <Teleport to="body">
      <EggCard
        v-if="showEggs && currentCity"
        :city-name="currentCity"
        :eggs="eggs"
        @close="closeEggs"
        @submitted="onEggSubmitted"
        @submit-egg="(nickname: string, message: string) => submitEgg(currentCity, nickname, message)"
      />
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>