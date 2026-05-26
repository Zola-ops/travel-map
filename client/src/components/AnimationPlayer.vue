<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { JourneyCity } from '@/types'
import {
  geoToPixel,
  buildPathPoints,
  computeFitTransform,
  transformPoint,
  getTransportEmoji,
  getTransportLabel,
  getTransportColor,
  easeInOutCubic,
} from '@/utils/animation'
import type { Point } from '@/utils/animation'
import { loadChinaGeoJSON, preRenderChinaMapFit } from '@/utils/mapRenderer'

const props = defineProps<{
  cities: JourneyCity[]
  speed?: number
}>()

const emit = defineEmits<{
  done: []
  close: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const isFinished = ref(false)
const currentSpeed = ref(props.speed || 1)
const speeds = [0.5, 1, 1.5, 2]

// GeoJSON & cached map
let cachedBitmap: ImageBitmap | null = null
let precomputed = false

// Animation state
type Phase = 'intro' | 'segment_pause' | 'segment_moving' | 'segment_arriving' | 'outro'
let phase: Phase = 'intro'
let currentSegIndex = 0
let segProgress = 0
let phaseTimer = 0
let rafId = 0
let lastTimestamp = 0

// Timing constants
const INTRO_DURATION = 0.8
const SEGMENT_PAUSE_DURATION = 0.5
const SEGMENT_MOVE_BASE_DURATION = 2.2
const ARRIVAL_DURATION = 0.4
const OUTRO_DURATION = 2.0

// Canvas
let ctx: CanvasRenderingContext2D | null = null
let displayW = 0
let displayH = 0

// Pre-computed
let pixelCities: Point[] = []
let transform: { scale: number; offsetX: number; offsetY: number } = { scale: 1, offsetX: 0, offsetY: 0 }
let transformedCities: Point[] = []
let segmentPaths: Point[][] = []
let segmentDurations: number[] = []
let segmentDistances: number[] = []

async function precompute() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  displayW = canvas.offsetWidth
  displayH = canvas.offsetHeight

  // Fallback: use parent dimensions if canvas hasn't been laid out yet
  if (displayW === 0 || displayH === 0) {
    const parent = canvas.parentElement
    if (parent) {
      displayW = parent.clientWidth
      displayH = parent.clientHeight
    }
  }

  // Still no size — abort, will retry on play
  if (displayW === 0 || displayH === 0) return
  const scale = Math.max(window.devicePixelRatio || 2, 2)
  canvas.width = displayW * scale
  canvas.height = displayH * scale
  ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Raw pixel coords (compute BEFORE map to get transform)
  pixelCities = props.cities.map((c) => geoToPixel(c.lng, c.lat, displayW, displayH))

  // Fit transform
  transform = computeFitTransform(pixelCities, displayW, displayH, 80)

  // Apply transform
  transformedCities = pixelCities.map((p) => transformPoint(p, transform))

  // Pre-render China map with city transform (so map aligns with cities)
  if (!cachedBitmap) {
    try {
      cachedBitmap = await preRenderChinaMapFit(displayW, displayH, transform)
    } catch {
      // Fallback: no map background
    }
  }

  // Pre-compute Bezier paths and segment distances
  segmentPaths = []
  segmentDistances = []
  for (let i = 0; i < transformedCities.length - 1; i++) {
    const path = buildPathPoints(transformedCities[i], transformedCities[i + 1], 100)
    segmentPaths.push(path)
    // Compute path length for distance-based timing
    let dist = 0
    for (let j = 1; j < path.length; j++) {
      const dx = path[j].x - path[j - 1].x
      const dy = path[j].y - path[j - 1].y
      dist += Math.sqrt(dx * dx + dy * dy)
    }
    segmentDistances.push(dist)
  }

  // Compute duration multipliers (distance / average, capped 0.5x–2x)
  const avgDist = segmentDistances.length > 0
    ? segmentDistances.reduce((a, b) => a + b, 0) / segmentDistances.length
    : 1
  segmentDurations = segmentDistances.map((d) => {
    const ratio = d / (avgDist || 1)
    return Math.max(0.5, Math.min(2.0, ratio))
  })
}

// ---- Rendering ----

function drawBackground() {
  if (!ctx) return
  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, displayW, displayH)
  if (cachedBitmap) {
    ctx.drawImage(cachedBitmap, 0, 0)
  }
}

function drawCityDot(x: number, y: number, index: number, state: 'past' | 'current' | 'future') {
  if (!ctx) return
  const city = props.cities[index]
  const label = city.label || city.cityName

  const radius = state === 'current' ? 5 : 4
  const color = state === 'future' ? '#9ca3af' : '#f5a623'

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // Label
  ctx.fillStyle = state === 'future' ? '#9ca3af' : '#374151'
  ctx.font = `${state === 'current' ? 13 : 11}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 12, y)
}

function drawPathLine(points: Point[], color: string, alpha: number = 0.7, dashed: boolean = false) {
  if (!ctx || points.length < 2) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  if (dashed) ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function getAngle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

function drawTransportIcon(x: number, y: number, transport: JourneyCity['transport']) {
  if (!ctx) return
  const emoji = getTransportEmoji(transport)
  ctx.font = '24px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, x, y)
}

function getCurrentTransport(): JourneyCity['transport'] {
  if (currentSegIndex < props.cities.length - 1) {
    return props.cities[currentSegIndex].transport
  }
  return 'plane'
}

// ---- Phase renders ----

function renderIntro() {
  if (!ctx) return
  drawBackground()
  const progress = Math.min(phaseTimer / INTRO_DURATION, 1)
  const eased = easeInOutCubic(progress)

  for (let i = 0; i < transformedCities.length; i++) {
    const t = transformedCities[i]
    const offsetY = (1 - eased) * 50
    ctx.globalAlpha = eased
    drawCityDot(t.x, t.y + offsetY, i, 'future')
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = `rgba(55, 65, 81, ${eased * 0.7})`
  ctx.font = 'bold 18px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(props.cities.map((c) => c.cityName || c.label).join(' → '), displayW / 2, displayH - 30)
}

function renderOutro() {
  if (!ctx) return
  drawBackground()

  for (let i = 0; i < transformedCities.length; i++) {
    drawCityDot(transformedCities[i].x, transformedCities[i].y, i, 'past')
  }

  for (let s = 0; s < segmentPaths.length; s++) {
    drawPathLine(segmentPaths[s], getTransportColor(props.cities[s].transport), 0.8, false)
  }

  const progress = Math.min(phaseTimer / OUTRO_DURATION, 1)
  ctx.fillStyle = `rgba(245, 166, 35, ${progress})`
  ctx.font = 'bold 18px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(
    `${props.cities.length} 个城市 · ${props.cities.map((c) => c.cityName).join(' → ')}`,
    displayW / 2,
    displayH - 30
  )
}

function renderMainFrame(dt: number) {
  if (!ctx) return
  drawBackground()

  // Draw all city dots
  for (let i = 0; i < transformedCities.length; i++) {
    let state: 'past' | 'current' | 'future'
    if (i < currentSegIndex) state = 'past'
    else if (i === currentSegIndex && (phase === 'segment_pause')) state = 'current'
    else if (i === currentSegIndex + 1 && phase === 'segment_moving') state = 'current'
    else if (i === currentSegIndex && phase === 'segment_arriving') state = 'current'
    else state = 'future'

    drawCityDot(transformedCities[i].x, transformedCities[i].y, i, state)
  }

  // Completed paths
  for (let s = 0; s < currentSegIndex; s++) {
    drawPathLine(segmentPaths[s], getTransportColor(props.cities[s].transport), 0.6, false)
  }

  // Future paths
  for (let s = currentSegIndex + 1; s < segmentPaths.length; s++) {
    drawPathLine(segmentPaths[s], getTransportColor(props.cities[s].transport), 0.15, true)
  }

  // Current segment
  if (currentSegIndex < segmentPaths.length) {
    const path = segmentPaths[currentSegIndex]
    const transport = getCurrentTransport()
    const color = getTransportColor(transport)

    if (phase === 'segment_pause') {
      drawPathLine(path, color, 0.25, true)
    } else if (phase === 'segment_moving') {
      const easedProgress = easeInOutCubic(segProgress)
      const visibleCount = Math.floor(easedProgress * path.length) + 1
      const visiblePath = path.slice(0, visibleCount)
      drawPathLine(visiblePath, color, 0.85, false)

      // Transport icon at current position
      const idx = Math.min(Math.floor(easedProgress * (path.length - 1)), path.length - 1)
      const iconPos = path[idx]

      if (iconPos) {
        drawTransportIcon(iconPos.x, iconPos.y, transport)
      }
    } else if (phase === 'segment_arriving') {
      drawPathLine(path, color, 0.8, false)
      const dest = path[path.length - 1]
      drawTransportIcon(dest.x, dest.y, transport)
    }
  }

  // Progress percentage
  const totalProgress = currentSegIndex + (phase === 'segment_moving' ? segProgress : phase === 'segment_arriving' ? 1 : 0)
  const pct = Math.round((totalProgress / (props.cities.length - 1)) * 100)
  ctx.fillStyle = 'rgba(55, 65, 81, 0.4)'
  ctx.font = '12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.min(pct, 100)}%`, displayW - 20, 28)

  if (phase === 'segment_moving' || phase === 'segment_pause') {
    ctx.textAlign = 'left'
    ctx.fillText(
      `${getTransportEmoji(getCurrentTransport())} ${getTransportLabel(getCurrentTransport())}`,
      20, 28
    )
  }
}

// ---- Animation loop ----

function getSegmentDuration(): number {
  const base = SEGMENT_MOVE_BASE_DURATION / currentSpeed.value
  const multiplier = segmentDurations[currentSegIndex] || 1
  return base * multiplier
}

function loop(timestamp: number) {
  if (!isPlaying.value) return

  if (lastTimestamp === 0) lastTimestamp = timestamp
  let dt = (timestamp - lastTimestamp) / 1000
  if (dt > 0.1) dt = 0.1
  lastTimestamp = timestamp

  phaseTimer += dt

  switch (phase) {
    case 'intro':
      if (phaseTimer >= INTRO_DURATION) {
        phase = 'segment_pause'; currentSegIndex = 0; phaseTimer = 0
      }
      renderIntro()
      break

    case 'segment_pause':
      if (phaseTimer >= SEGMENT_PAUSE_DURATION / currentSpeed.value) {
        phase = 'segment_moving'; segProgress = 0; phaseTimer = 0
      }
      renderMainFrame(dt)
      break

    case 'segment_moving':
      segProgress = phaseTimer / getSegmentDuration()
      if (segProgress >= 1) {
        segProgress = 1; phase = 'segment_arriving'; phaseTimer = 0
      }
      renderMainFrame(dt)
      break

    case 'segment_arriving':
      if (phaseTimer >= ARRIVAL_DURATION / currentSpeed.value) {
        currentSegIndex++
        if (currentSegIndex >= props.cities.length - 1) {
          phase = 'outro'; phaseTimer = 0
        } else {
          phase = 'segment_pause'; phaseTimer = 0
        }
      }
      renderMainFrame(dt)
      break

    case 'outro':
      if (phaseTimer >= OUTRO_DURATION) {
        isPlaying.value = false; isFinished.value = true
        renderOutro()
        return
      }
      renderOutro()
      break
  }

  rafId = requestAnimationFrame(loop)
}

// ---- Initial static render ----

function drawInitialFrame() {
  if (!ctx) return
  drawBackground()

  // Draw all cities highlighted
  for (let i = 0; i < transformedCities.length; i++) {
    drawCityDot(transformedCities[i].x, transformedCities[i].y, i, 'current')
  }

  // Draw dashed preview paths for all segments
  for (let s = 0; s < segmentPaths.length; s++) {
    drawPathLine(segmentPaths[s], getTransportColor(props.cities[s].transport), 0.3, true)
  }

  // Draw city route at bottom
  ctx.fillStyle = 'rgba(55, 65, 81, 0.5)'
  ctx.font = 'bold 16px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(props.cities.map((c) => c.cityName || c.label).join(' → '), displayW / 2, displayH - 24)
}

function waitForLayout(): Promise<void> {
  return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function initCanvas() {
  if (precomputed) return
  await nextTick()
  // Wait for browser layout to complete before reading canvas dimensions
  await waitForLayout()
  if (!canvasRef.value) return
  // If canvas still has no size, the parent layout hasn't settled; retry once
  if (canvasRef.value.offsetWidth === 0 || canvasRef.value.offsetHeight === 0) {
    await waitForLayout()
  }
  await precompute()
  precomputed = true
  drawInitialFrame()
}

onMounted(initCanvas)

// ---- Public API ----

async function playAnimation() {
  if (isPlaying.value) return
  isPlaying.value = true
  isFinished.value = false
  phase = 'intro'; currentSegIndex = 0; segProgress = 0; phaseTimer = 0
  lastTimestamp = 0

  if (!precomputed) {
    await nextTick()
    await waitForLayout()
    if (!canvasRef.value) return
    if (canvasRef.value.offsetWidth === 0 || canvasRef.value.offsetHeight === 0) {
      await waitForLayout()
    }
    await precompute()
    precomputed = true
  }
  rafId = requestAnimationFrame(loop)
}

function togglePlayPause() {
  if (isPlaying.value) {
    isPlaying.value = false; cancelAnimationFrame(rafId)
  } else {
    isPlaying.value = true; lastTimestamp = 0
    rafId = requestAnimationFrame(loop)
  }
}

function setSpeed(s: number) {
  currentSpeed.value = s
}

function restart() {
  cancelAnimationFrame(rafId)
  isFinished.value = false
  playAnimation()
}

async function renderExportFrame(): Promise<HTMLCanvasElement> {
  const EXPORT_WIDTH = 2560
  // Compute export height based on cities bounding box aspect ratio
  const xs = props.cities.map((c) => geoToPixel(c.lng, c.lat, 1000, 1000).x)
  const ys = props.cities.map((c) => geoToPixel(c.lng, c.lat, 1000, 1000).y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const dataW = maxX - minX || 1
  const dataH = maxY - minY || 1
  const aspectRatio = dataW / dataH
  const EXPORT_HEIGHT = Math.round(EXPORT_WIDTH / aspectRatio)

  const offscreen = document.createElement('canvas')
  offscreen.width = EXPORT_WIDTH
  offscreen.height = EXPORT_HEIGHT
  const offCtx = offscreen.getContext('2d')!

  // Compute geometry at export resolution
  const epCities = props.cities.map((c) => geoToPixel(c.lng, c.lat, EXPORT_WIDTH, EXPORT_HEIGHT))
  const eTransform = computeFitTransform(epCities, EXPORT_WIDTH, EXPORT_HEIGHT, 120)
  const etCities = epCities.map((p) => transformPoint(p, eTransform))
  const ePaths: Point[][] = []
  for (let i = 0; i < etCities.length - 1; i++) {
    ePaths.push(buildPathPoints(etCities[i], etCities[i + 1], 150))
  }

  // Draw background with China map using city transform
  offCtx.fillStyle = '#f9fafb'
  offCtx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
  if (cachedBitmap) {
    // Re-render at export size with export transform
    try {
      const exportBitmap = await preRenderChinaMapFit(EXPORT_WIDTH, EXPORT_HEIGHT, eTransform)
      offCtx.drawImage(exportBitmap, 0, 0)
      exportBitmap.close()
    } catch {
      // fallback
    }
  }

  // Draw paths
  for (let s = 0; s < ePaths.length; s++) {
    offCtx.save()
    offCtx.strokeStyle = getTransportColor(props.cities[s].transport)
    offCtx.globalAlpha = 0.8
    offCtx.lineWidth = 4
    offCtx.lineCap = 'round'
    offCtx.beginPath()
    offCtx.moveTo(ePaths[s][0].x, ePaths[s][0].y)
    for (let i = 1; i < ePaths[s].length; i++) {
      offCtx.lineTo(ePaths[s][i].x, ePaths[s][i].y)
    }
    offCtx.stroke()
    offCtx.restore()
  }

  // Draw city dots
  for (let i = 0; i < etCities.length; i++) {
    const city = props.cities[i]
    const label = city.label || city.cityName

    offCtx.beginPath()
    offCtx.arc(etCities[i].x, etCities[i].y, 8, 0, Math.PI * 2)
    offCtx.fillStyle = '#f5a623'
    offCtx.fill()

    offCtx.fillStyle = '#374151'
    offCtx.font = '22px Inter, system-ui, sans-serif'
    offCtx.textAlign = 'left'
    offCtx.textBaseline = 'middle'
    offCtx.fillText(label, etCities[i].x + 18, etCities[i].y)
  }

  // Footer text
  offCtx.fillStyle = 'rgba(245, 166, 35, 0.8)'
  offCtx.font = 'bold 26px Inter, system-ui, sans-serif'
  offCtx.textAlign = 'center'
  offCtx.fillText(
    props.cities.map((c) => c.cityName).join(' → '),
    EXPORT_WIDTH / 2,
    EXPORT_HEIGHT - 50
  )

  return offscreen
}

async function exportImage() {
  const offscreen = await renderExportFrame()
  const cityNames = props.cities.map(c => c.cityName).filter(Boolean).join('-')
  const link = document.createElement('a')
  link.download = `旅程地图-${cityNames || '未命名'}.png`
  link.href = offscreen.toDataURL('image/png')
  link.click()
}

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-white flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4">
      <h3 class="font-title text-xl text-gray-900">旅程动画预览</h3>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
          <button
            v-for="s in speeds" :key="s" @click="setSpeed(s)"
            class="px-3 py-1 rounded text-xs font-medium transition-all duration-200"
            :class="currentSpeed === s ? 'bg-brand-navy text-white' : 'text-gray-500 hover:text-gray-900'"
          >{{ s }}×</button>
        </div>

        <button v-if="!isPlaying && !isFinished" @click="playAnimation"
          class="px-5 py-2 bg-brand-orange hover:bg-brand-orange/80 text-white rounded-xl text-sm font-medium transition-all">播放</button>

        <button v-if="isPlaying" @click="togglePlayPause"
          class="px-5 py-2 bg-gray-100 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-medium transition-all">暂停</button>

        <button v-if="isFinished" @click="restart"
          class="px-5 py-2 bg-brand-navy hover:bg-brand-navy/80 text-white rounded-xl text-sm font-medium transition-all">重播</button>

        <button @click="exportImage"
          class="px-4 py-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green rounded-xl text-sm font-medium transition-all border border-brand-green/30">导出图片</button>

        <button @click="emit('close')" class="text-gray-500 hover:text-gray-900 text-sm ml-1 transition-colors">关闭</button>
      </div>
    </div>

    <!-- Canvas -->
    <div class="flex-1 flex items-center justify-center p-4">
      <canvas ref="canvasRef" class="w-full h-full rounded-xl border border-gray-200" />
    </div>

    <!-- Footer -->
    <div class="text-center pb-5 text-sm text-gray-500">
      {{ cities.length }} 个城市 · {{ cities.map(c => c.cityName).join(' → ') }}
    </div>
  </div>
</template>