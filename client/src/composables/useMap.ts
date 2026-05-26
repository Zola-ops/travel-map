import { ref, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { JourneyCity, EggCount, VisitedCity } from '@/types'
import { TRANSPORT_OPTIONS } from '@/types'
import { computeFitBounds } from '@/utils/geo'

export function useMap() {
  const chartRef = ref<HTMLDivElement | null>(null)
  const chartInstance = shallowRef<echarts.ECharts | null>(null)

  function initMap(container: HTMLDivElement, geoJson?: any, mapName?: string) {
    if (chartInstance.value) {
      chartInstance.value.dispose()
    }

    const chart = echarts.init(container, undefined, { renderer: 'canvas' })
    chartInstance.value = chart

    if (geoJson && mapName) {
      echarts.registerMap(mapName, geoJson)
    }

    const baseOption: any = {
      backgroundColor: 'transparent',
    }

    if (geoJson && mapName) {
      baseOption.geo = {
        map: mapName,
        roam: true,
        zoom: 1.2,
        center: [104.5, 36],
        label: { show: false },
        itemStyle: {
          areaColor: '#e5e7eb',
          borderColor: 'rgba(156, 163, 175, 0.5)',
          borderWidth: 1,
        },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: '#d1d5db' },
        },
      }
    } else {
      // World / no-geo mode: use a blank coordinate space
      baseOption.xAxis = {
        type: 'value',
        min: -180,
        max: 180,
        show: false,
      }
      baseOption.yAxis = {
        type: 'value',
        min: -90,
        max: 90,
        show: false,
      }
      baseOption.grid = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      }
      baseOption.backgroundColor = '#f9fafb'
    }

    chart.setOption(baseOption)
    return chart
  }

  function showCityMarkers(cities: { cityName: string; lat: number; lng: number; label?: string }[]) {
    if (!chartInstance.value) return

    const hasGeo = (chartInstance.value.getOption() as any).geo

    chartInstance.value.setOption({
      series: [
        {
          type: 'scatter',
          coordinateSystem: hasGeo ? 'geo' : 'cartesian2d',
          data: cities.map((c, i) => ({
            name: c.cityName,
            value: hasGeo ? [c.lng, c.lat, c.label || `${i + 1}`] : [c.lng, c.lat],
          })),
          symbolSize: hasGeo ? 12 : 14,
          itemStyle: {
            color: '#f5a623',
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'right',
            formatter: (p: any) => p.name,
            color: '#374151',
            fontSize: 12,
          },
        },
      ],
    })
  }

  function showPaths(cities: JourneyCity[]) {
    if (!chartInstance.value || cities.length < 2) return

    const hasGeo = (chartInstance.value.getOption() as any).geo
    if (!hasGeo) return

    const currentOption = chartInstance.value.getOption() as any
    const existingSeries = (currentOption.series || []) as any[]

    const linesSeries = TRANSPORT_OPTIONS.map((opt) => {
      const segments: Array<{ coords: [number, number][] }> = []
      for (let i = 0; i < cities.length - 1; i++) {
        if (cities[i].transport === opt.value) {
          segments.push({
            coords: [
              [cities[i].lng, cities[i].lat],
              [cities[i + 1].lng, cities[i + 1].lat],
            ],
          })
        }
      }

      return {
        type: 'lines',
        coordinateSystem: 'geo' as const,
        polyline: false,
        data: segments,
        lineStyle: {
          color: opt.color,
          width: 2.5,
          curveness: 0.15,
        },
        effect: {
          show: true,
          period: 4,
          trailLength: 0.3,
          symbol: 'arrow',
          symbolSize: 7,
          color: opt.color,
        },
      }
    }).filter((s) => s.data.length > 0)

    // Transport icon scatter at midpoints
    const midpoints: Array<[number, number]> = []
    const midpointIcons: string[] = []
    const midpointColors: string[] = []
    const transportColors: Record<string, string> = {
      plane: '#4a90e2', train: '#7ed321', car: '#6b7280', bike: '#f5a623',
    }

    for (let i = 0; i < cities.length - 1; i++) {
      const midLng = (cities[i].lng + cities[i + 1].lng) / 2
      const midLat = (cities[i].lat + cities[i + 1].lat) / 2
      const transport = cities[i].transport
      const opt = TRANSPORT_OPTIONS.find(o => o.value === transport)
      if (opt) {
        midpoints.push([midLng, midLat])
        midpointIcons.push(opt.icon)
        midpointColors.push(transportColors[transport] || '#888')
      }
    }

    if (midpoints.length > 0) {
      const midSeries = {
        type: 'scatter',
        coordinateSystem: 'geo' as const,
        name: '交通方式',
        data: midpoints.map((mp, i) => ({
          value: mp,
          icon: midpointIcons[i],
          iconColor: midpointColors[i],
        })),
        symbolSize: 0,
        symbol: 'none',
        itemStyle: {
          color: 'transparent',
        },
        label: {
          show: true,
          formatter: (p: any) => p.data.icon || '',
          position: 'inside',
          fontSize: 14,
        },
        silent: true,
      }

      const newSeries = [
        ...existingSeries.filter((s: any) => s.name !== '交通方式'),
        ...linesSeries,
        midSeries,
      ]
      chartInstance.value.setOption({ series: newSeries })
    } else {
      chartInstance.value.setOption({ series: [...existingSeries, ...linesSeries] })
    }
  }

  function showEggDots(eggCounts: EggCount[]) {
    if (!chartInstance.value) return
    // Placeholder for egg dots visualization
  }

  function showVisitedMarkers(visitedCities: VisitedCity[]) {
    if (!chartInstance.value) return
    const hasGeo = (chartInstance.value.getOption() as any).geo
    if (!hasGeo) return

    const manualCities = visitedCities.filter(c => c.source === 'manual')
    const anydoorCities = visitedCities.filter(c => c.source === 'anydoor')

    const series: any[] = []

    // Manual cities: brand-green (#7ed321) dots
    if (manualCities.length > 0) {
      series.push({
        type: 'scatter',
        coordinateSystem: 'geo',
        name: '已到访',
        data: manualCities.map(c => ({
          name: c.cityName,
          value: [c.lng, c.lat],
        })),
        symbolSize: 14,
        itemStyle: { color: '#7ed321', borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => p.name,
          color: '#374151',
          fontSize: 11,
        },
      })
    }

    // Anydoor cities: brand-sky (#4a90e2) dots
    if (anydoorCities.length > 0) {
      series.push({
        type: 'scatter',
        coordinateSystem: 'geo',
        name: '任意门',
        data: anydoorCities.map(c => ({
          name: c.cityName,
          value: [c.lng, c.lat],
        })),
        symbolSize: 12,
        itemStyle: { color: '#4a90e2', borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => p.name,
          color: '#374151',
          fontSize: 11,
        },
      })
    }

    const existingSeries = (chartInstance.value.getOption() as any).series || []
    chartInstance.value.setOption({ series: [...existingSeries.filter((s: any) => s.name !== '已到访' && s.name !== '任意门'), ...series] })
  }

  function flyToCity(lng: number, lat: number) {
    if (!chartInstance.value) return
    const hasGeo = (chartInstance.value.getOption() as any).geo
    if (hasGeo) {
      chartInstance.value.setOption({ geo: { center: [lng, lat], zoom: 3 } })
    }
  }

  function fitBounds(cities: { lng: number; lat: number }[]) {
    if (!chartInstance.value) return
    const { center, zoom } = computeFitBounds(cities)
    const hasGeo = (chartInstance.value.getOption() as any).geo
    if (hasGeo) {
      chartInstance.value.setOption({ geo: { center, zoom } })
    }
    // For non-geo mode, ECharts auto-scales scatter within xAxis/yAxis range
  }

  function resetView() {
    if (!chartInstance.value) return
    const hasGeo = (chartInstance.value.getOption() as any).geo
    if (hasGeo) {
      chartInstance.value.setOption({ geo: { center: [104.5, 36], zoom: 1.2 } })
    }
  }

  function dispose() {
    chartInstance.value?.dispose()
    chartInstance.value = null
  }

  return {
    chartRef,
    chartInstance,
    initMap,
    showCityMarkers,
    showPaths,
    showEggDots,
    showVisitedMarkers,
    flyToCity,
    fitBounds,
    resetView,
    dispose,
  }
}