<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Journey, JourneyCity } from '@/types'
import { useJourney } from '@/composables/useJourney'
import { templates } from '@/data/templates'
import TemplateSelector from '@/components/TemplateSelector.vue'
import JourneyEditor from '@/components/JourneyEditor.vue'
import JourneyViewer from '@/components/JourneyViewer.vue'
import { getUserId } from '@/utils/uuid'

const { journeys, fetchJourneys, createJourney } = useJourney()

type Step = 'list' | 'template' | 'editor' | 'view'

const step = ref<Step>('list')
const editingCities = ref<JourneyCity[]>([])
const editingName = ref('')
const editingTemplateType = ref('custom')
const previewCities = ref<JourneyCity[]>([])
const viewJourney = ref<Journey | null>(null)

onMounted(() => {
  fetchJourneys()
})

// Flow: Select template
function onSelectTemplate(key: string) {
  const tpl = templates.find((t) => t.key === key)
  if (tpl) {
    editingCities.value = tpl.presetCities.map((c, i) => ({
      cityName: '',
      lat: 0,
      lng: 0,
      sortOrder: i + 1,
      transport: i < tpl.presetCities.length - 1 ? 'plane' : 'plane',
      label: c.label,
    }))
    editingName.value = tpl.name
    editingTemplateType.value = tpl.key
    step.value = 'editor'
  }
}

// Flow: Start custom
function onStartCustom() {
  editingCities.value = []
  editingName.value = ''
  editingTemplateType.value = 'custom'
  step.value = 'editor'
}

// Flow: Save journey
async function onSave(name: string, cities: JourneyCity[]) {
  const id = await createJourney({
    userNickname: '旅行者',
    journeyName: name || '未命名旅程',
    templateType: editingTemplateType.value,
    cities: cities.filter((c) => c.cityName),
  })

  if (id) {
    step.value = 'list'
  }
}

// Flow: Preview
function onPreview(cities: JourneyCity[]) {
  previewCities.value = cities.filter((c) => c.cityName)
  viewJourney.value = null
  step.value = 'view'
}

// Flow: View saved journey
function onViewJourney(journey: Journey) {
  viewJourney.value = journey
  previewCities.value = journey.cities
  step.value = 'view'
}

// Flow: Export (via ECharts)
function onExport() {
  // Handled inside JourneyViewer via MapCanvas exportImage
}
</script>

<template>
  <div class="h-full">
    <!-- Step: Journey List -->
    <div v-if="step === 'list'" class="h-full flex flex-col p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-title text-2xl text-gray-900">我的旅程</h2>
        <button
          @click="step = 'template'"
          class="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/80 text-white rounded-xl font-medium text-sm transition-all"
        >
          + 创建新旅程
        </button>
      </div>

      <!-- Journey cards -->
      <div v-if="journeys.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        <button
          v-for="j in journeys"
          :key="j.id"
          @click="onViewJourney(j)"
          class="bg-white border border-gray-200 hover:border-brand-navy rounded-2xl p-5 text-left transition-all group shadow-sm hover:shadow-md"
        >
          <h3 class="text-gray-900 font-semibold mb-1">{{ j.journeyName }}</h3>
          <p class="text-xs text-gray-500 mb-3">{{ j.createdAt }}</p>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>{{ j.cities?.length || 0 }} 个城市</span>
            <span v-if="j.templateType === 'template_life'" class="px-2 py-0.5 bg-gray-100 rounded text-xs">人生轨迹</span>
            <span v-else-if="j.templateType === 'template_year'" class="px-2 py-0.5 bg-gray-100 rounded text-xs">年度足迹</span>
            <span v-else class="px-2 py-0.5 bg-gray-100 rounded text-xs">自定义</span>
          </div>
        </button>
      </div>

      <!-- Empty state -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-500">
        <div class="text-6xl mb-4">🗺️</div>
        <p class="text-lg mb-2">还没有旅程</p>
        <p class="text-sm mb-6">创建你的第一条旅程，在地图上留下足迹</p>
        <button
          @click="step = 'template'"
          class="px-6 py-3 bg-brand-navy hover:bg-brand-navy/80 text-white rounded-xl font-medium transition-all"
        >
          开始创建
        </button>
      </div>
    </div>

    <!-- Step: Template Selector -->
    <TemplateSelector
      v-if="step === 'template'"
      @select-template="onSelectTemplate"
      @start-custom="onStartCustom"
    />

    <!-- Step: Journey Editor -->
    <JourneyEditor
      v-if="step === 'editor'"
      :initial-cities="editingCities"
      :journey-name="editingName"
      @save="onSave"
      @preview="onPreview"
      @back="step = 'list'"
    />

    <!-- Step: Journey View (MapCanvas) -->
    <JourneyViewer
      v-if="step === 'view'"
      :journey-name="viewJourney?.journeyName || '未命名旅程'"
      :cities="previewCities"
      @close="step = 'list'"
    />
  </div>
</template>