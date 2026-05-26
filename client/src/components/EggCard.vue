<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import gsap from 'gsap'
import type { Egg } from '@/types'
import { useUser } from '@/composables/useUser'

const props = defineProps<{
  cityName: string
  eggs: Egg[]
}>()

const emit = defineEmits<{
  close: []
  submitted: []
  submitEgg: [nickname: string, message: string]
}>()

const { username } = useUser()
const showForm = ref(false)
const nickname = ref(username.value || '')
const message = ref('')
const submitted = ref(false)
const cardRef = ref<HTMLDivElement | null>(null)
const formRef = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  await nextTick()
  if (cardRef.value) {
    gsap.fromTo(cardRef.value,
      { scale: 0.8, opacity: 0, y: 40, rotation: -2 },
      { scale: 1, opacity: 1, y: 0, rotation: 0, duration: 0.5, ease: 'back.out(1.7)' }
    )
  }
})

function openForm() {
  showForm.value = true
  nextTick(() => {
    if (formRef.value) {
      gsap.fromTo(formRef.value,
        { height: 0, opacity: 0, marginTop: 0 },
        { height: 'auto', opacity: 1, marginTop: 12, duration: 0.35, ease: 'power2.out' }
      )
    }
  })
}

async function closeForm() {
  if (formRef.value) {
    await gsap.to(formRef.value, { height: 0, opacity: 0, marginTop: 0, duration: 0.25, ease: 'power2.in' })
  }
  showForm.value = false
}

async function handleSubmit() {
  if (!nickname.value || !message.value) return
  emit('submitEgg', nickname.value, message.value)
  submitted.value = true

  await closeForm()

  // Success pulse
  if (cardRef.value) {
    gsap.to(cardRef.value, { scale: 1.02, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  }

  setTimeout(() => {
    submitted.value = false
    emit('submitted')
  }, 1500)
}

async function handleClose() {
  if (cardRef.value) {
    await gsap.to(cardRef.value, { scale: 0.9, opacity: 0, y: 20, duration: 0.25, ease: 'power2.in' })
  }
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="handleClose">
    <div ref="cardRef" class="bg-white border border-gray-200 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">📍 {{ cityName }}</h3>
          <p class="text-xs text-gray-500">{{ eggs.length }} 条彩蛋</p>
        </div>
        <button @click="handleClose" class="text-gray-500 hover:text-gray-900 text-xl transition-colors">&times;</button>
      </div>

      <!-- Eggs -->
      <div class="px-6 py-4 max-h-80 overflow-y-auto space-y-4">
        <div v-if="!eggs.length" class="text-center py-8">
          <p class="text-gray-500">这里还没有人留下足迹</p>
          <p class="text-brand-orange text-sm mt-1">来做第一个吧！</p>
        </div>

        <div
          v-for="(egg, i) in eggs"
          :key="egg.id"
          class="bg-gray-50 rounded-xl p-4"
        >
          <p class="text-gray-900 text-sm leading-relaxed">{{ egg.message }}</p>
          <div class="flex items-center justify-between mt-3">
            <span class="text-xs text-gray-500">— {{ egg.nickname }}</span>
            <span class="text-xs text-gray-500">{{ egg.createdAt?.slice(0, 10) }}</span>
          </div>
        </div>
      </div>

      <!-- Form or Button -->
      <div class="px-6 py-4 border-t border-gray-200">
        <div v-if="submitted" class="text-center text-brand-green py-2 text-sm">
          你的彩蛋已留在 {{ cityName }}，等待下一位旅行者发现 ✨
        </div>
        <div v-else-if="showForm" ref="formRef" class="space-y-3 overflow-hidden">
          <input v-model="nickname" placeholder="你的昵称" maxlength="50" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-colors" />
          <textarea v-model="message" placeholder="写下你想说的话...（最多 140 字）" maxlength="140" rows="2" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-orange resize-none transition-colors" />
          <div class="flex gap-2">
            <button @click="handleSubmit" :disabled="!nickname || !message" class="flex-1 py-2 bg-brand-orange hover:bg-brand-orange/80 disabled:bg-gray-100 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-all">
              留下彩蛋
            </button>
            <button @click="closeForm" class="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl text-sm transition-all">取消</button>
          </div>
        </div>
        <button v-else @click="openForm" class="w-full py-2.5 bg-brand-navy hover:bg-brand-navy/80 text-white rounded-xl text-sm font-medium transition-all">
          我也留一个
        </button>
      </div>
    </div>
  </div>
</template>