import type { Template } from '@/types'

export const templates: Template[] = [
  {
    key: 'template_life',
    name: '我的人生轨迹',
    description: '从出生到现在的城市印记',
    presetCities: [
      { cityName: '', label: '出生地' },
      { cityName: '', label: '大学城市' },
      { cityName: '', label: '第一份工作' },
      { cityName: '', label: '现在所在城市' },
    ],
    questions: [
      '你在哪里出生？',
      '在哪里度过了大学时光？',
      '第一份工作把你带到了哪个城市？',
      '现在的你，停靠在哪里？',
    ],
  },
  {
    key: 'template_year',
    name: '2026 年度足迹',
    description: '回顾这一年的城市轨迹',
    presetCities: [
      { cityName: '', label: '1月' },
      { cityName: '', label: '4月' },
      { cityName: '', label: '7月' },
      { cityName: '', label: '10月' },
      { cityName: '', label: '12月' },
    ],
    questions: [
      '今年1月你在哪里？',
      '春天去了哪座城市？',
      '夏天有什么出行？',
      '秋天呢？',
      '年末你停在哪？',
    ],
  },
]