<script setup lang="ts">
import { ref, computed } from 'vue'
import { provinces } from '@/data/cities'
import type { CityData } from '@/data/cities'

const emit = defineEmits<{
  select: [city: { cityName: string; lat: number; lng: number }]
  close: []
}>()

const PROVINCE_DISPLAY: Record<string, string> = {
  '北京市': '北京', '天津市': '天津', '上海市': '上海', '重庆市': '重庆',
  '河北省': '河北', '山西省': '山西', '辽宁省': '辽宁', '吉林省': '吉林',
  '黑龙江省': '黑龙江', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
  '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
  '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '海南省': '海南',
  '四川省': '四川', '贵州省': '贵州', '云南省': '云南', '陕西省': '陕西',
  '甘肃省': '甘肃', '青海省': '青海', '台湾省': '台湾',
  '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏',
  '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
  '香港特别行政区': '香港', '澳门特别行政区': '澳门',
}

function displayName(fullName: string): string {
  return PROVINCE_DISPLAY[fullName] || fullName.replace(/省|市|自治区|特别行政区/g, '')
}

const selectedProvince = ref('')
const searchText = ref('')
const panelRef = ref<HTMLDivElement | null>(null)

const filteredProvinces = computed(() => {
  if (!searchText.value) return provinces
  const q = searchText.value.toLowerCase()
  return provinces.filter(p => {
    if (p.name.toLowerCase().includes(q)) return true
    return p.cities.some(c => c.name.toLowerCase().includes(q))
  }).map(p => ({
    ...p,
    cities: p.cities.filter(c =>
      c.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    ),
  }))
})

const selectedCities = computed(() => {
  if (!selectedProvince.value) return []
  const p = provinces.find(p => p.name === selectedProvince.value)
  return p ? p.cities : []
})

function selectProvince(name: string) {
  selectedProvince.value = name
}

function selectCity(city: CityData) {
  emit('select', { cityName: city.name, lat: city.lat, lng: city.lng })
}

// Quick city search across all provinces
const quickResults = computed(() => {
  if (searchText.value.length < 1) return [] as { city: CityData; province: string }[]
  const q = searchText.value.toLowerCase()
  const results: { city: CityData; province: string }[] = []
  for (const p of provinces) {
    for (const c of p.cities) {
      if (c.name.toLowerCase().includes(q)) {
        results.push({ city: c, province: p.name })
        if (results.length >= 20) return results
      }
    }
  }
  return results
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search bar -->
    <div class="px-4 py-3 border-b border-gray-200">
      <input
        v-model="searchText"
        placeholder="搜索省份或城市..."
        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-colors"
      />
    </div>

    <!-- Quick search results (when searching across all) -->
    <div v-if="searchText && quickResults.length" class="flex-1 overflow-y-auto px-2 py-2">
      <p class="text-xs text-gray-500 px-3 pb-2">搜索结果 ({{ quickResults.length }})</p>
      <button
        v-for="(item, i) in quickResults"
        :key="i"
        @click="selectCity(item.city)"
        class="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-between"
      >
        <span>{{ item.city.name }}</span>
        <span class="text-xs text-gray-500">{{ item.province }}</span>
      </button>
    </div>

    <!-- Province → City cascading view -->
    <div v-else class="flex-1 flex min-h-0">
      <!-- Province sidebar -->
      <div class="w-1/3 border-r border-gray-200 overflow-y-auto">
        <button
          v-for="p in filteredProvinces"
          :key="p.name"
          @click="selectProvince(p.name)"
          class="w-full text-left px-3 py-2.5 text-sm transition-colors truncate"
          :class="selectedProvince === p.name
            ? 'bg-brand-navy/10 text-brand-orange border-r-2 border-brand-orange'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'"
        >
          {{ displayName(p.name) }}
          <span class="text-xs text-gray-500 ml-1">({{ p.cities.length }})</span>
        </button>
      </div>

      <!-- City grid -->
      <div class="flex-1 overflow-y-auto p-3">
        <template v-if="selectedProvince">
          <p class="text-xs text-gray-500 mb-2">{{ selectedProvince }} · {{ selectedCities.length }} 个城市</p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="city in selectedCities"
              :key="city.name"
              @click="selectCity(city)"
              class="text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-brand-navy/10 hover:text-gray-900 transition-colors"
            >
              {{ city.name }}
            </button>
          </div>
        </template>
        <div v-else class="flex items-center justify-center h-full text-gray-500 text-sm">
          选择一个省份查看城市
        </div>
      </div>
    </div>
  </div>
</template>