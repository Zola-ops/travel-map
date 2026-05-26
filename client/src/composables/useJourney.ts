import { ref } from 'vue'
import api from '@/utils/api'
import type { Journey, JourneyCity, ApiResponse, City } from '@/types'

export function useJourney() {
  const journeys = ref<Journey[]>([])
  const loading = ref(false)

  async function fetchJourneys() {
    loading.value = true
    try {
      const { data } = await api.get<ApiResponse<Journey[]>>('/journeys')
      if (data.code === 0) journeys.value = data.data || []
    } finally {
      loading.value = false
    }
  }

  async function fetchJourney(id: number): Promise<Journey | null> {
    const { data } = await api.get<ApiResponse<Journey>>(`/journeys/${id}`)
    return data.code === 0 ? data.data || null : null
  }

  async function createJourney(params: {
    userNickname: string
    journeyName: string
    templateType: string
    cities: JourneyCity[]
  }): Promise<number | null> {
    const { data } = await api.post<ApiResponse<{ id: number }>>('/journeys', params)
    if (data.code === 0) {
      await fetchJourneys()
      return data.data!.id
    }
    return null
  }

  async function updateJourneyCities(id: number, cities: JourneyCity[]) {
    await api.put(`/journeys/${id}/cities`, { cities })
  }

  async function searchCities(query: string): Promise<City[]> {
    if (!query.trim()) return []
    const { data } = await api.get<ApiResponse<City[]>>('/cities/search', {
      params: { q: query },
    })
    return data.code === 0 ? data.data || [] : []
  }

  return {
    journeys,
    loading,
    fetchJourneys,
    fetchJourney,
    createJourney,
    updateJourneyCities,
    searchCities,
  }
}