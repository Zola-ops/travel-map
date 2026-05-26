export interface City {
  id: number
  cityName: string
  lat: number
  lng: number
  country: string
  level: string
}

export interface JourneyCity {
  id?: number
  journeyId?: number
  cityName: string
  lat: number
  lng: number
  sortOrder: number
  transport: 'plane' | 'train' | 'car' | 'bike'
  label?: string
}

export interface Journey {
  id: number
  userId?: string
  userNickname: string
  journeyName: string
  templateType: 'template_life' | 'template_year' | 'custom'
  createdAt: string
  cities: JourneyCity[]
}

export interface DuoSession {
  id: number
  inviteCode: string
  userAId: string
  userBId?: string
  userANickname: string
  userBNickname?: string
  createdAt: string
  expiresAt: string
}

export interface DuoNode {
  id?: number
  sessionId?: number
  userType: 'A' | 'B'
  cityName: string
  lat: number
  lng: number
  sortOrder: number
  label?: string
  meetText?: string
}

export interface MeetingPoint {
  cityName: string
  lat: number
  lng: number
  textA?: string | null
  textB?: string | null
}

export interface DuoMapData {
  session: DuoSession
  userANodes: DuoNode[]
  userBNodes: DuoNode[]
  meetingPoints: MeetingPoint[]
}

export interface Egg {
  id: number
  cityName: string
  nickname: string
  message: string
  isSeed: number
  createdAt: string
}

export interface EggCount {
  cityName: string
  count: number
}

export interface ApiResponse<T> {
  code: number
  data?: T
  message?: string
}

export interface Template {
  key: string
  name: string
  description: string
  presetCities: { cityName: string; label: string }[]
  questions: string[]
}

export const TRANSPORT_OPTIONS = [
  { value: 'plane' as const, label: '飞机', icon: '✈️', color: '#4a90e2' },
  { value: 'train' as const, label: '高铁', icon: '🚄', color: '#7ed321' },
  { value: 'car' as const, label: '自驾', icon: '🚗', color: '#9b9b9b' },
  { value: 'bike' as const, label: '骑行', icon: '🚴', color: '#f5a623' },
] as const

export interface VisitedCity {
  cityName: string
  lat: number
  lng: number
  source: 'manual' | 'anydoor'
  visitedAt: string
}