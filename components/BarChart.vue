<script setup lang="ts">
interface BarDatum {
  label: string
  value: number
}

interface Bar {
  key: string
  label: string
  displayLabel: string
  value: number
  displayValue: string
  x: number
  y: number
  width: number
  barHeight: number
  centerX: number
  valueY: number
  labelY: number
}

const props = withDefaults(
  defineProps<{
    data: BarDatum[]
    height?: number
  }>(),
  {
    height: 200,
  },
)

const TOP_PAD = 20
const BOTTOM_PAD = 24
const MIN_BAR = 3
const MAX_LABEL_CHARS = 10

const width = computed<number>(() => Math.max(props.data.length * 56, 160))

const maxValue = computed<number>(() => {
  const values: number[] = props.data.map((d: BarDatum): number => d.value)
  return values.length ? Math.max(...values, 0) : 0
})

const isEmpty = computed<boolean>(() => maxValue.value <= 0)

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
})

function truncate(label: string): string {
  if (label.length <= MAX_LABEL_CHARS) return label
  return `${label.slice(0, MAX_LABEL_CHARS - 1)}…`
}

const bars = computed<Bar[]>(() => {
  const count: number = props.data.length
  if (!count) return []

  const chartHeight: number = Math.max(props.height - TOP_PAD - BOTTOM_PAD, 1)
  const slotWidth: number = width.value / count
  const barWidth: number = Math.min(slotWidth * 0.58, 48)
  const max: number = maxValue.value

  return props.data.map((d: BarDatum, index: number): Bar => {
    const ratio: number = max > 0 ? d.value / max : 0
    let barHeight: number = ratio * chartHeight
    if (d.value > 0 && barHeight < MIN_BAR) barHeight = MIN_BAR
    if (d.value <= 0) barHeight = 0

    const centerX: number = slotWidth * index + slotWidth / 2
    const x: number = centerX - barWidth / 2
    const y: number = TOP_PAD + (chartHeight - barHeight)

    return {
      key: `${index}-${d.label}`,
      label: d.label,
      displayLabel: truncate(d.label),
      value: d.value,
      displayValue: numberFormatter.format(d.value),
      x,
      y,
      width: barWidth,
      barHeight,
      centerX,
      valueY: y - 6,
      labelY: props.height - 8,
    }
  })
})
</script>

<template>
  <div class="w-full">
    <div
      v-if="isEmpty"
      class="flex items-center justify-center text-sm text-[var(--ui-text-dimmed)]"
      :style="{ height: `${props.height}px` }"
    >
      Aucune donnée à afficher
    </div>

    <svg
      v-else
      class="w-full"
      :viewBox="`0 0 ${width} ${props.height}`"
      :style="{ height: `${props.height}px` }"
      aria-hidden="true"
    >
      <g v-for="bar in bars" :key="bar.key">
        <rect
          v-if="bar.barHeight > 0"
          :x="bar.x"
          :y="bar.y"
          :width="bar.width"
          :height="bar.barHeight"
          rx="4"
          fill="var(--ui-bg-inverted)"
        />
        <text
          :x="bar.centerX"
          :y="bar.valueY"
          text-anchor="middle"
          font-size="11"
          fill="var(--ui-text-muted)"
        >
          {{ bar.displayValue }}
        </text>
        <text
          :x="bar.centerX"
          :y="bar.labelY"
          text-anchor="middle"
          font-size="11"
          fill="var(--ui-text-dimmed)"
        >
          {{ bar.displayLabel }}
        </text>
      </g>
    </svg>
  </div>
</template>
