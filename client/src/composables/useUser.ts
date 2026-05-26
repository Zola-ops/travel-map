import { ref, computed } from 'vue'

const STORAGE_KEY = 'travelmap_username'

const username = ref<string>(localStorage.getItem(STORAGE_KEY) || '')
const hasName = computed(() => username.value.length > 0)

export function useUser() {
  function setName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    username.value = trimmed
    localStorage.setItem(STORAGE_KEY, trimmed)
  }

  function clearName() {
    username.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    username,
    hasName,
    setName,
    clearName,
  }
}