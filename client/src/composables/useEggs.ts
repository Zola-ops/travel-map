import { ref } from 'vue'
import api from '@/utils/api'
import type { Egg, EggCount, ApiResponse } from '@/types'

export function useEggs() {
  const eggs = ref<Egg[]>([])
  const eggCounts = ref<EggCount[]>([])
  const loading = ref(false)

  async function fetchEggs(cityName: string) {
    loading.value = true
    try {
      const { data } = await api.get<ApiResponse<Egg[]>>(`/eggs/${encodeURIComponent(cityName)}`)
      if (data.code === 0) eggs.value = data.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchEggCounts() {
    const { data } = await api.get<ApiResponse<EggCount[]>>('/cities/egg-count')
    if (data.code === 0) eggCounts.value = data.data || []
  }

  async function submitEgg(cityName: string, nickname: string, message: string) {
    const { data } = await api.post<ApiResponse<null>>('/eggs', {
      cityName,
      nickname,
      message,
    })
    return data.code === 0
  }

  return { eggs, eggCounts, loading, fetchEggs, fetchEggCounts, submitEgg }
}