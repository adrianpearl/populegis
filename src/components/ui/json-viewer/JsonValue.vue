<script setup lang="ts">
import { ref, computed } from 'vue'
import { MoreHorizontal, ChevronUp } from '@lucide/vue'
import { cn } from '@/lib/utils'

interface Props {
  value: unknown
  type: string
}

const props = defineProps<Props>()

const isExpanded = ref(false)
const MAX_LENGTH = 80

const displayValue = computed(() => {
  if (props.value instanceof Date) {
    return props.value.toISOString()
  }

  if (props.type === 'string') {
    const str = props.value as string
    return `"${str}"`
  }

  if (props.value === null) {
    return 'null'
  }

  if (props.value === undefined) {
    return 'undefined'
  }

  return String(props.value)
})

const isTruncatable = computed(() => {
  return props.type === 'string' && displayValue.value.length > MAX_LENGTH
})

const truncatedValue = computed(() => {
  if (!isTruncatable.value) return displayValue.value
  return isExpanded.value
    ? displayValue.value
    : displayValue.value.slice(0, MAX_LENGTH) + '..."'
})

const colorClass = computed(() => {
  if (props.value instanceof Date) {
    return 'text-purple-500 dark:text-purple-400'
  }

  switch (props.type) {
    case 'string':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'number':
      return 'text-amber-600 dark:text-amber-400'
    case 'boolean':
      return 'text-blue-600 dark:text-blue-400'
    case 'null':
      return 'text-rose-600 dark:text-rose-400'
    case 'undefined':
      return 'text-muted-foreground'
    default:
      return 'text-foreground'
  }
})

function toggleExpand() {
  if (isTruncatable.value) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
<div class="inline-flex items-baseline gap-1">
  <span :class="cn('break-all text-xs', colorClass)">
    {{ truncatedValue }}
  </span>

  <button v-if="isTruncatable" @click="toggleExpand"
    class="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    :aria-label="isExpanded ? 'Collapse' : 'Expand'">
    <ChevronUp v-if="isExpanded" :size="12" />
    <MoreHorizontal v-else :size="12" />
  </button>
</div>
</template>
