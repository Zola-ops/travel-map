<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import gsap from 'gsap'

const router = useRouter()
const route = useRoute()

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

function switchTab(tab: typeof tabs[0]) {
  router.push(tab.path)
}

// GSAP page transition on route change
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
    <header class="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <h1 class="font-title text-2xl font-bold text-brand-orange tracking-wide">旅程地图</h1>
      <nav class="flex gap-1 bg-gray-50 rounded-xl p-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="switchTab(tab)"
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300"
          :class="activeTab === tab.key
            ? 'bg-brand-navy text-white shadow-md'
            : 'text-gray-500 hover:text-gray-900'"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="w-20" /><!-- spacer -->
    </header>

    <!-- Main Content with GSAP page transition -->
    <main ref="mainRef" class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>