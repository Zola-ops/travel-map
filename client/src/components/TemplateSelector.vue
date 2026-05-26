<script setup lang="ts">
import { templates } from '@/data/templates'

const emit = defineEmits<{
  selectTemplate: [key: string]
  startCustom: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full p-8">
    <h2 class="font-title text-3xl text-gray-900 mb-2">创建你的旅程</h2>
    <p class="text-gray-500 mb-10">选择一种方式，开始记录你的足迹</p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
      <!-- Template cards -->
      <button
        v-for="tpl in templates"
        :key="tpl.key"
        @click="emit('selectTemplate', tpl.key)"
        class="group relative bg-white border border-gray-200 rounded-2xl p-6 text-left transition-all duration-300 hover:border-brand-orange hover:scale-105 hover:shadow-sm"
      >
        <div class="text-4xl mb-4">{{ tpl.key === 'template_life' ? '🗺️' : '📅' }}</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ tpl.name }}</h3>
        <p class="text-sm text-gray-500 mb-4">{{ tpl.description }}</p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="city in tpl.presetCities"
            :key="city.label"
            class="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
          >
            {{ city.label }}
          </span>
        </div>
        <div class="absolute inset-0 rounded-2xl ring-1 ring-transparent group-hover:ring-brand-orange/30 transition-all" />
      </button>

      <!-- Custom journey -->
      <button
        @click="emit('startCustom')"
        class="group relative bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-left transition-all duration-300 hover:border-brand-sky hover:scale-105"
      >
        <div class="text-4xl mb-4">✏️</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">自定义旅程</h3>
        <p class="text-sm text-gray-500">从零开始，自由规划你的路线</p>
      </button>
    </div>
  </div>
</template>