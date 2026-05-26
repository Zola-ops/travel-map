<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DuoNode, JourneyCity } from '@/types'
import { useDualMap } from '@/composables/useDualMap'
import { useJourney } from '@/composables/useJourney'
import MapCanvas from './MapCanvas.vue'
import CityPicker from './CityPicker.vue'
import { allCities as cityData } from '@/data/cities'

type Phase = 'create' | 'waiting' | 'join' | 'result'

const phase = ref<Phase>('create')
const currentRole = ref<'A' | 'B'>('A')

// Creator state
const nicknameA = ref('')
const citiesA = ref<DuoNode[]>([])
const inviteCode = ref('')
const searchQueryA = ref('')
const searchResultsA = ref<any[]>([])
const { searchCities } = useJourney()
const { duoData, createDual, joinDual, fetchDual } = useDualMap()

// Joiner state
const joinCode = ref('')
const nicknameB = ref('')
const citiesB = ref<DuoNode[]>([])
const searchQueryB = ref('')
const searchResultsB = ref<any[]>([])

// City picker state
const showCityPickerA = ref(false)
const showCityPickerB = ref(false)

// Client-side search from local city data
function localSearch(q: string) {
  if (!q.trim()) return []
  const lower = q.toLowerCase()
  return cityData
    .filter(c => c.name.toLowerCase().includes(lower))
    .slice(0, 20)
    .map(c => ({
      id: 0, cityName: c.name, lat: c.lat, lng: c.lng,
      country: c.province, level: 'city',
    }))
}

async function searchA(q: string) {
  if (q.length < 1) { searchResultsA.value = []; return }
  const local = localSearch(q)
  searchResultsA.value = local.length > 0 ? local : await searchCities(q)
}

function addCityA(city: any) {
  citiesA.value.push({
    cityName: city.cityName, lat: city.lat, lng: city.lng,
    sortOrder: citiesA.value.length + 1, userType: 'A', label: '',
  })
  searchQueryA.value = ''
  searchResultsA.value = []
}

function removeCityA(i: number) {
  citiesA.value.splice(i, 1)
  citiesA.value.forEach((c, j) => (c.sortOrder = j + 1))
}

async function handleCreate() {
  const result = await createDual(nicknameA.value, citiesA.value)
  if (result) {
    inviteCode.value = result.inviteCode
    phase.value = 'waiting'
  }
}

async function searchB(q: string) {
  if (q.length < 1) { searchResultsB.value = []; return }
  const local = localSearch(q)
  searchResultsB.value = local.length > 0 ? local : await searchCities(q)
}

function onPickerSelectA(city: { cityName: string; lat: number; lng: number }) {
  addCityA(city)
  showCityPickerA.value = false
}

function onPickerSelectB(city: { cityName: string; lat: number; lng: number }) {
  addCityB(city)
  showCityPickerB.value = false
}

function addCityB(city: any) {
  citiesB.value.push({
    cityName: city.cityName, lat: city.lat, lng: city.lng,
    sortOrder: citiesB.value.length + 1, userType: 'B', label: '',
  })
  searchQueryB.value = ''
  searchResultsB.value = []
}

function removeCityB(i: number) {
  citiesB.value.splice(i, 1)
  citiesB.value.forEach((c, j) => (c.sortOrder = j + 1))
}

async function handleJoin() {
  const result = await joinDual(joinCode.value, nicknameB.value, citiesB.value)
  if (result) {
    currentRole.value = 'B'
    await fetchDual(joinCode.value)
    phase.value = 'result'
  }
}

async function handleViewResult() {
  await fetchDual(joinCode.value || inviteCode.value)
  phase.value = 'result'
}

// Combine cities for map display
const allCities = computed<JourneyCity[]>(() => {
  if (!duoData.value) return []
  return [
    ...duoData.value.userANodes.map((n, i) => ({
      cityName: n.cityName, lat: n.lat, lng: n.lng,
      sortOrder: i + 1, transport: 'plane' as const, label: n.label,
    })),
    ...duoData.value.userBNodes.map((n, i) => ({
      cityName: n.cityName, lat: n.lat, lng: n.lng,
      sortOrder: i + 1, transport: 'train' as const, label: n.label,
    })),
  ]
})

const mapCanvasRef = ref<InstanceType<typeof MapCanvas> | null>(null)

function exportDualImage() {
  const url = mapCanvasRef.value?.exportImage()
  if (!url) return
  const link = document.createElement('a')
  link.download = `双人地图-${duoData.value?.session.userANickname || 'A'}-${duoData.value?.session.userBNickname || 'B'}.png`
  link.href = url
  link.click()
}

function reset() {
  phase.value = 'create'
  duoData.value = null
  citiesA.value = []
  citiesB.value = []
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <!-- Phase: Create (User A) -->
    <div v-if="phase === 'create'" class="p-6 max-w-xl mx-auto">
      <h2 class="font-title text-2xl text-gray-900 mb-6">创建双人地图</h2>

      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-2">你的昵称</label>
        <input v-model="nicknameA" placeholder="输入你的昵称..." class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" />
      </div>

      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-2">标记你的城市节点（按时间顺序）</label>
        <div class="flex gap-2">
          <input v-model="searchQueryA" @input="searchA(($event.target as HTMLInputElement).value)" placeholder="搜索城市添加..." class="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-sky" />
          <button @click="showCityPickerA = true" class="px-3 py-2 bg-gray-100 border border-gray-300 hover:border-brand-orange rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all" title="按省份选择">📋</button>
        </div>
        <div v-if="searchResultsA.length" class="mt-1 bg-gray-100 border border-gray-300 rounded-xl overflow-hidden">
          <button v-for="city in searchResultsA" :key="city.id" @click="addCityA(city)" class="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-700">
            {{ city.cityName }} <span class="text-gray-500">{{ city.country }}</span>
          </button>
        </div>
      </div>

      <!-- City list for A -->
      <div class="flex flex-col gap-2 mb-6">
        <div v-for="(city, i) in citiesA" :key="i" class="flex items-center gap-2 bg-gray-100 rounded-xl p-3 group">
          <span class="w-6 h-6 rounded-full bg-brand-navy flex items-center justify-center text-xs font-bold text-white">{{ i + 1 }}</span>
          <span class="flex-1 text-sm text-gray-900">{{ city.cityName }}</span>
          <button @click="removeCityA(i)" class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
        </div>
        <div v-if="!citiesA.length" class="text-center text-sm text-gray-500 py-4">点击搜索添加你的城市节点</div>
      </div>

      <button @click="handleCreate" :disabled="!nicknameA || citiesA.length < 2" class="w-full py-3 bg-brand-orange hover:bg-brand-orange/80 disabled:bg-gray-100 disabled:text-gray-600 text-white rounded-xl font-medium transition-all">
        创建双人地图
      </button>
    </div>

    <!-- Phase: Waiting for User B -->
    <div v-if="phase === 'waiting'" class="p-6 max-w-xl mx-auto text-center">
      <div class="text-6xl mb-6">🤝</div>
      <h2 class="font-title text-2xl text-gray-900 mb-4">等待另一位加入</h2>
      <div class="bg-gray-50 border-2 border-dashed border-brand-orange rounded-2xl p-8 mb-6">
        <p class="text-gray-500 text-sm mb-2">分享邀请码给另一个人</p>
        <p class="text-4xl font-mono font-bold text-brand-orange tracking-widest">{{ inviteCode }}</p>
      </div>
      <p class="text-sm text-gray-500 mb-6">邀请码有效期 7 天</p>
      <div class="flex gap-3 justify-center">
        <button @click="handleViewResult" class="px-6 py-2.5 bg-brand-navy text-white rounded-xl text-sm font-medium">查看地图</button>
        <button @click="reset" class="px-6 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm">重新创建</button>
      </div>
    </div>

    <!-- Phase: Join (User B) -->
    <div v-if="phase === 'join'" class="p-6 max-w-xl mx-auto">
      <h2 class="font-title text-2xl text-gray-900 mb-6">加入双人地图</h2>

      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-2">邀请码</label>
        <input v-model="joinCode" placeholder="输入6位邀请码..." maxlength="6" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-lg tracking-widest placeholder-gray-400 focus:outline-none focus:border-brand-orange uppercase" />
      </div>

      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-2">你的昵称</label>
        <input v-model="nicknameB" placeholder="输入你的昵称..." class="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange" />
      </div>

      <div class="mb-4">
        <label class="block text-sm text-gray-500 mb-2">标记你的城市节点</label>
        <div class="flex gap-2">
          <input v-model="searchQueryB" @input="searchB(($event.target as HTMLInputElement).value)" placeholder="搜索城市添加..." class="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-sky" />
          <button @click="showCityPickerB = true" class="px-3 py-2 bg-gray-100 border border-gray-300 hover:border-brand-orange rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-all" title="按省份选择">📋</button>
        </div>
        <div v-if="searchResultsB.length" class="mt-1 bg-gray-100 border border-gray-300 rounded-xl overflow-hidden">
          <button v-for="city in searchResultsB" :key="city.id" @click="addCityB(city)" class="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-700">
            {{ city.cityName }} <span class="text-gray-500">{{ city.country }}</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2 mb-6">
        <div v-for="(city, i) in citiesB" :key="i" class="flex items-center gap-2 bg-gray-100 rounded-xl p-3 group">
          <span class="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-xs font-bold text-white">{{ i + 1 }}</span>
          <span class="flex-1 text-sm text-gray-900">{{ city.cityName }}</span>
          <button @click="removeCityB(i)" class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
        </div>
      </div>

      <button @click="handleJoin" :disabled="!joinCode || !nicknameB || citiesB.length < 2" class="w-full py-3 bg-brand-orange hover:bg-brand-orange/80 disabled:bg-gray-100 disabled:text-gray-600 text-white rounded-xl font-medium transition-all">
        加入
      </button>
      <button @click="phase = 'create'" class="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-900">返回创建</button>
    </div>

    <!-- Phase: Result -->
    <div v-if="phase === 'result' && duoData" class="h-full flex flex-col lg:flex-row gap-4 p-4">
      <div class="lg:w-72 flex-shrink-0 overflow-y-auto space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-title text-xl text-gray-900">双人地图</h3>
          <div class="flex items-center gap-2">
            <button @click="exportDualImage" class="px-3 py-1.5 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green rounded-xl text-xs font-medium transition-all border border-brand-green/30">导出图片</button>
            <button @click="reset" class="text-sm text-gray-500 hover:text-gray-900">返回</button>
          </div>
        </div>

        <!-- User A info -->
        <div class="bg-white rounded-xl p-4 border-l-4 border-brand-sky">
          <p class="text-brand-sky font-semibold">{{ duoData.session.userANickname }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ duoData.userANodes.map(n => n.cityName).join(' → ') }}</p>
        </div>

        <!-- User B info -->
        <div v-if="duoData.session.userBNickname" class="bg-white rounded-xl p-4 border-l-4 border-pink-500">
          <p class="text-pink-400 font-semibold">{{ duoData.session.userBNickname }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ duoData.userBNodes.map(n => n.cityName).join(' → ') }}</p>
        </div>
        <div v-else class="bg-white rounded-xl p-4 border border-dashed border-gray-300 text-center">
          <p class="text-sm text-gray-500">等待另一位加入</p>
          <p class="text-xs text-brand-orange mt-2">邀请码: {{ duoData.session.inviteCode }}</p>
        </div>

        <!-- Meeting points -->
        <div v-if="duoData.meetingPoints.length" class="bg-white rounded-xl p-4">
          <h4 class="text-sm font-semibold text-brand-orange mb-3">✨ 相遇点 ({{ duoData.meetingPoints.length }})</h4>
          <div v-for="(mp, i) in duoData.meetingPoints" :key="i" class="mb-3 pb-3 border-b border-gray-200 last:border-0">
            <p class="text-gray-900 font-medium">{{ mp.cityName }}</p>
            <p v-if="mp.textA" class="text-xs text-brand-sky mt-1">{{ duoData.session.userANickname }}: {{ mp.textA }}</p>
            <p v-if="mp.textB" class="text-xs text-pink-400 mt-1">{{ duoData.session.userBNickname }}: {{ mp.textB }}</p>
          </div>
        </div>
      </div>

      <!-- Map -->
      <div class="flex-1 min-h-0">
        <MapCanvas ref="mapCanvasRef" mode="dual" :cities="allCities" :show-paths="true" />
      </div>
    </div>

    <!-- Entry point buttons for unauthenticated view -->
    <div v-if="phase === 'create'" class="flex justify-center mt-2">
      <button @click="phase = 'join'" class="text-sm text-brand-sky hover:text-brand-sky/80">
        已有邀请码？加入双人地图
      </button>
    </div>
  </div>

  <!-- City Picker Modal for User A -->
  <Teleport to="body">
    <div
      v-if="showCityPickerA"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="showCityPickerA = false"
    >
      <div class="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl h-[70vh] mx-4 overflow-hidden shadow-2xl flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">选择城市</h3>
          <button @click="showCityPickerA = false" class="text-gray-500 hover:text-gray-900 text-xl transition-colors">&times;</button>
        </div>
        <CityPicker @select="onPickerSelectA" @close="showCityPickerA = false" />
      </div>
    </div>
  </Teleport>

  <!-- City Picker Modal for User B -->
  <Teleport to="body">
    <div
      v-if="showCityPickerB"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="showCityPickerB = false"
    >
      <div class="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl h-[70vh] mx-4 overflow-hidden shadow-2xl flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">选择城市</h3>
          <button @click="showCityPickerB = false" class="text-gray-500 hover:text-gray-900 text-xl transition-colors">&times;</button>
        </div>
        <CityPicker @select="onPickerSelectB" @close="showCityPickerB = false" />
      </div>
    </div>
  </Teleport>
</template>