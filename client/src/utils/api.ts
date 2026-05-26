import axios from 'axios'
import { getUserId } from './uuid'
import type { ApiResponse } from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Inject X-User-Id for all requests
api.interceptors.request.use((config) => {
  config.headers['X-User-Id'] = getUserId()
  return config
})

// Unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || '网络错误，请稍后重试'
    console.error('[API Error]', msg)
    return Promise.reject(error)
  }
)

export default api