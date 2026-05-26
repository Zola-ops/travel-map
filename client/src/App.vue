<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUser } from '@/composables/useUser'
import gsap from 'gsap'

const router = useRouter()
const route = useRoute()
const { username, hasName, setName } = useUser()

const tabs = [
  { key: 'personal', label: '个人旅程', path: '/personal' },
  { key: 'dual', label: '双人地图', path: '/dual' },
  { key: 'anydoor', label: '个人足迹', path: '/anydoor' },
]

const activeTab = computed(() => {
  if (route.path.startsWith('/dual')) return 'dual'
  if (route.path.startsWith('/anydoor')) return 'anydoor'
  return 'personal'
})

const mainRef = ref<HTMLElement | null>(null)
const nameInput = ref('')
const showNameModal = ref(!hasName.value)

function submitName() {
  const n = nameInput.value.trim()
  if (!n) return
  setName(n)
  showNameModal.value = false
}

function switchTab(tab: typeof tabs[0]) {
  router.push(tab.path)
}

watch(() => route.path, async () => {
  await nextTick()
  if (mainRef.value) {
    gsap.fromTo(mainRef.value,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    )
  }
})
</script>

<template>
  <div class="h-screen flex flex-col bg-white">
    <!-- Top Tab Bar -->
    <header class="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
      <h1 class="font-title text-xl sm:text-2xl font-bold text-brand-orange tracking-wide">旅程地图</h1>
      <nav class="flex gap-1 bg-gray-50 rounded-xl p-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="switchTab(tab)"
          class="px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300"
          :class="activeTab === tab.key
            ? 'bg-brand-navy text-white shadow-md'
            : 'text-gray-500 hover:text-gray-900'"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="w-16 sm:w-20 flex items-center justify-end">
        <span v-if="hasName" class="text-xs text-gray-400 truncate">{{ username }}</span>
      </div>
    </header>

    <!-- Main Content -->
    <main ref="mainRef" class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

    <!-- Name input modal -->
    <Teleport to="body">
      <div v-if="showNameModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-2xl p-8 w-80 shadow-xl">
          <div class="text-5xl text-center mb-4">🗺️</div>
          <h2 class="text-xl font-title font-bold text-gray-900 text-center mb-2">欢迎来到旅程地图</h2>
          <p class="text-sm text-gray-500 text-center mb-6">输入你的名字，开始记录旅程</p>
          <input
            v-model="nameInput"
            @keyup.enter="submitName"
            placeholder="你的名字"
            autofocus
            class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 mb-4"
          />
          <button
            @click="submitName"
            :disabled="!nameInput.trim()"
            class="w-full py-3 bg-brand-orange hover:bg-brand-orange/80 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium transition-all"
          >
            开始旅程
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>