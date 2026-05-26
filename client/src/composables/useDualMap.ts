import { ref } from 'vue'
import api from '@/utils/api'
import type { DuoMapData, DuoNode, ApiResponse } from '@/types'

export function useDualMap() {
  const duoData = ref<DuoMapData | null>(null)
  const loading = ref(false)

  async function createDual(nickname: string, cities: DuoNode[]) {
    const { data } = await api.post<ApiResponse<{ inviteCode: string; sessionId: number }>>('/duo/create', {
      nickname,
      cities,
    })
    return data.code === 0 ? data.data : null
  }

  async function joinDual(code: string, nickname: string, cities: DuoNode[]) {
    const { data } = await api.post<ApiResponse<{ sessionId: number }>>(`/duo/${code}/join`, {
      nickname,
      cities,
    })
    return data.code === 0 ? data.data : null
  }

  async function fetchDual(code: string) {
    loading.value = true
    try {
      const { data } = await api.get<ApiResponse<DuoMapData>>(`/duo/${code}`)
      if (data.code === 0) duoData.value = data.data || null
    } finally {
      loading.value = false
    }
  }

  return { duoData, loading, createDual, joinDual, fetchDual }
}