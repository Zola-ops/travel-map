import type { JourneyCity } from '@/types'
import {
  geoToPixel,
  buildPathPoints,
  computeFitTransform,
  transformPoint,
  getTransportEmoji,
  getTransportColor,
} from './animation'
import { loadChinaGeoJSON, preRenderChinaMapFit } from './mapRenderer'
import type { Point } from './animation'

/**
 * 导出包含中国地图底图 + 旅程路线的高清 PNG
 * 在 PersonalJourney 页面点击导出时调用
 */
export async function exportJourneyWithMap(
  cities: JourneyCity[],
  journeyName: string,
) {
  if (!cities.length) {
    console.warn('No cities to export')
    return
  }

  const EXPORT_WIDTH = 2560
  const PADDING = 120

  // ---- 根据城市包围盒计算导出画布高度 ----
  const rawCities = cities.map((c) => geoToPixel(c.lng, c.lat, 1000, 1000))
  const xs = rawCities.map((p) => p.x)
  const ys = rawCities.map((p) => p.y)
  const dataW = Math.max(...xs) - Math.min(...xs) || 1
  const dataH = Math.max(...ys) - Math.min(...ys) || 1
  const aspectRatio = dataW / dataH
  const rawHeight = Math.round(EXPORT_WIDTH / aspectRatio)
  // Clamp within reasonable bounds
  const EXPORT_HEIGHT = Math.min(Math.max(rawHeight, 1200), 4000)

  // ---- 离屏 Canvas ----
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')!

  // ===== 1. 浅色背景 =====
  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)

  // ===== 2. 先计算城市变换 =====
  const epCities = cities.map((c) => geoToPixel(c.lng, c.lat, EXPORT_WIDTH, EXPORT_HEIGHT))
  const transform = computeFitTransform(epCities, EXPORT_WIDTH, EXPORT_HEIGHT, PADDING)

  // ===== 3. 中国地图（使用城市变换以保证对齐）=====
  try {
    const mapBitmap = await preRenderChinaMapFit(EXPORT_WIDTH, EXPORT_HEIGHT, transform)
    ctx.drawImage(mapBitmap, 0, 0)
    mapBitmap.close()
  } catch {
    // 加载失败则无地图底图
  }

  // ===== 4. 城市坐标（应用同变换）=====
  const transformedCities = epCities.map((p) => transformPoint(p, transform))

  // ===== 4. 构建贝塞尔路径 =====
  const paths: Point[][] = []
  for (let i = 0; i < transformedCities.length - 1; i++) {
    paths.push(buildPathPoints(transformedCities[i], transformedCities[i + 1], 150))
  }

  // ===== 5. 绘制路径线 =====
  for (let s = 0; s < paths.length; s++) {
    const color = getTransportColor(cities[s].transport)

    // 路径阴影
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.75
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(paths[s][0].x, paths[s][0].y)
    for (let i = 1; i < paths[s].length; i++) {
      ctx.lineTo(paths[s][i].x, paths[s][i].y)
    }
    ctx.stroke()
    ctx.restore()

    // ===== 6. 路径中间绘制交通工具 emoji =====
    const midIdx = Math.floor(paths[s].length / 2)
    const midPoint = paths[s][midIdx]
    ctx.font = '40px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(getTransportEmoji(cities[s].transport), midPoint.x, midPoint.y)
  }

  // ===== 7. 绘制城市圆点和标签 =====
  for (let i = 0; i < transformedCities.length; i++) {
    const city = cities[i]
    const label = city.label || city.cityName
    const { x, y } = transformedCities[i]

    // 外圈光晕
    ctx.save()
    ctx.shadowColor = 'rgba(245, 166, 35, 0.45)'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#f5a623'
    ctx.fill()
    ctx.restore()

    // 内圈白芯
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // 序号徽章（右上偏移）
    ctx.beginPath()
    ctx.arc(x + 10, y - 10, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#f5a623'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), x + 10, y - 10)

    // 城市名
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 22px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + 22, y)
  }

  // ===== 8. 底部信息栏 =====
  const footerH = 130
  const gradient = ctx.createLinearGradient(0, EXPORT_HEIGHT - footerH, 0, EXPORT_HEIGHT)
  gradient.addColorStop(0, 'rgba(249, 250, 251, 0)')
  gradient.addColorStop(0.5, 'rgba(249, 250, 251, 0.92)')
  gradient.addColorStop(1, 'rgba(249, 250, 251, 1)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, EXPORT_HEIGHT - footerH, EXPORT_WIDTH, footerH)

  // 旅程名称
  ctx.fillStyle = '#1f2937'
  ctx.font = 'bold 30px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(journeyName, EXPORT_WIDTH / 2, EXPORT_HEIGHT - 70)

  // 日期 + 城市数量
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  ctx.fillStyle = '#6b7280'
  ctx.font = '18px Inter, system-ui, sans-serif'
  ctx.fillText(`${cities.length} 个城市 · 生成于 ${date}`, EXPORT_WIDTH / 2, EXPORT_HEIGHT - 30)

  // ===== 9. 触发下载 =====
  const safeName = journeyName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
  const link = document.createElement('a')
  link.download = `${safeName}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

// 保留旧函数向后兼容（标记为 deprecated）
export async function exportJourneyPNG(
  element: HTMLElement,
  journeyName: string,
  cityCount: number,
) {
  // 动态 import html2canvas 避免未安装时的 crash
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a',
      useCORS: true,
      scale: 2,
    })

    const ctx = canvas.getContext('2d')!
    const padding = 20
    const boxH = 60
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.fillRect(0, canvas.height - boxH, canvas.width, boxH)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.fillText(journeyName, padding, canvas.height - boxH + 24)
    ctx.fillStyle = '#9b9b9b'
    ctx.font = '12px Inter, sans-serif'
    const date = new Date().toLocaleDateString('zh-CN')
    ctx.fillText(`${cityCount} 个城市 · 生成于 ${date}`, padding, canvas.height - boxH + 44)

    const link = document.createElement('a')
    link.download = `${journeyName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch {
    console.warn('html2canvas not available, export skipped')
  }
}