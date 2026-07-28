<script setup lang="ts">
interface TrendPoint {
  label: string
  value: number | null
}

const props = withDefaults(
  defineProps<{
    data: TrendPoint[]
    height?: number
    suffix?: string
  }>(),
  {
    height: 200,
    suffix: '',
  },
)

const W = 800
const PAD_TOP = 8
const PAD_BOTTOM = 24
const PAD_X = 4

interface ScaledPoint {
  x: number
  y: number
  value: number
}

const hasData = computed<boolean>(() =>
  props.data.some((p) => p.value !== null && Number.isFinite(p.value as number)),
)

const bounds = computed<{ min: number; max: number }>(() => {
  const values = props.data
    .map((p) => p.value)
    .filter((v): v is number => v !== null && Number.isFinite(v))
  if (values.length === 0) return { min: 0, max: 1 }
  let min = Math.min(...values)
  let max = Math.max(...values)
  min = min - 1
  max = max + 1
  if (min === max) {
    min -= 1
    max += 1
  }
  return { min, max }
})

// Coordonnées X/Y de chaque point non-null, avec l'index d'origine conservé.
const scaledPoints = computed<Array<ScaledPoint | null>>(() => {
  const h = props.height
  const { min, max } = bounds.value
  const n = props.data.length
  const usableW = W - PAD_X * 2
  const usableH = h - PAD_TOP - PAD_BOTTOM
  const denom = max - min || 1
  const step = n > 1 ? usableW / (n - 1) : 0

  return props.data.map((p, i) => {
    if (p.value === null || !Number.isFinite(p.value)) return null
    const x = PAD_X + (n > 1 ? step * i : usableW / 2)
    const ratio = (p.value - min) / denom
    const y = PAD_TOP + usableH * (1 - ratio)
    return { x, y, value: p.value }
  })
})

// Regroupe les points contigus non-null en segments séparés (casse sur les null).
const segments = computed<ScaledPoint[][]>(() => {
  const result: ScaledPoint[][] = []
  let current: ScaledPoint[] = []
  for (const pt of scaledPoints.value) {
    if (pt === null) {
      if (current.length > 0) {
        result.push(current)
        current = []
      }
    } else {
      current.push(pt)
    }
  }
  if (current.length > 0) result.push(current)
  return result
})

// Construit un path lissé (Catmull-Rom -> Bézier cubique) pour une liste de points.
function buildSmoothPath(pts: ScaledPoint[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) {
    const p = pts[0]!
    return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  }
  let d = `M ${pts[0]!.x.toFixed(2)} ${pts[0]!.y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

const linePaths = computed<string[]>(() =>
  segments.value.map((seg) => buildSmoothPath(seg)).filter((d) => d.length > 0),
)

// Aire sous la courbe: reprend le tracé lissé puis referme jusqu'au bas.
const areaPaths = computed<string[]>(() => {
  const baseY = props.height - PAD_BOTTOM
  return segments.value
    .filter((seg) => seg.length > 0)
    .map((seg) => {
      const line = buildSmoothPath(seg)
      const first = seg[0]!
      const last = seg[seg.length - 1]!
      return `${line} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`
    })
})

const dots = computed<ScaledPoint[]>(() =>
  scaledPoints.value.filter((p): p is ScaledPoint => p !== null),
)

// useId() = identifiant stable entre SSR et client (évite un mismatch d'hydratation).
const gradientId = `trend-fill-${useId()}`

const viewBox = computed<string>(() => `0 0 ${W} ${props.height}`)
</script>

<template>
  <div class="w-full text-[var(--ui-text)]">
    <svg
      class="w-full"
      :viewBox="viewBox"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.12" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
        </linearGradient>
      </defs>

      <template v-if="hasData">
        <path
          v-for="(area, i) in areaPaths"
          :key="`area-${i}`"
          :d="area"
          :fill="`url(#${gradientId})`"
          stroke="none"
        />
        <path
          v-for="(line, i) in linePaths"
          :key="`line-${i}`"
          :d="line"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <circle
          v-for="(dot, i) in dots"
          :key="`dot-${i}`"
          :cx="dot.x"
          :cy="dot.y"
          r="3"
          fill="var(--ui-bg-elevated)"
          stroke="currentColor"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </template>
    </svg>

    <p
      v-if="!hasData"
      class="mt-2 text-center text-xs text-[var(--ui-text-dimmed)]"
    >
      Aucune donnée disponible
    </p>

    <div
      v-if="data.length > 0"
      class="mt-2 flex justify-between text-xs text-[var(--ui-text-dimmed)]"
    >
      <span v-for="(point, i) in data" :key="`lbl-${i}`">{{ point.label }}</span>
    </div>
  </div>
</template>
