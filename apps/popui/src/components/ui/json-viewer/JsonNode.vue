<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePointerSwipe } from '@vueuse/core'
import { ChevronRight, ChevronDown, Copy, Check } from '@lucide/vue'
import { cn } from '@/lib/utils'
import JsonValue from './JsonValue.vue'

interface Props {
  name: string
  value: unknown
  type: string
  level: number
  defaultExpanded?: boolean
  defaultExpandedLevel?: number
  searchTerm?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false,
  defaultExpandedLevel: Infinity,
  searchTerm: '',
})

const isExpanded = ref(props.defaultExpanded && props.level < props.defaultExpandedLevel)
const copied = ref(false)
const isDirectlyHovered = ref(false)
const rowRef = ref<HTMLElement | null>(null)

const { isSwiping } = usePointerSwipe(rowRef, { threshold: 10 })

const isExpandable = computed(() => {
  if (props.value instanceof Date) return false
  return props.type === 'object' || props.type === 'array'
})

// Helper: does this subtree contain the search term in any key or primitive value?
function subtreeHasMatch(value: unknown, name: string, term: string): boolean {
  if (!term?.trim()) return true
  const lowerTerm = term.toLowerCase()

  if (name.toLowerCase().includes(lowerTerm)) return true

  if (value == null) return String(value).toLowerCase().includes(lowerTerm)
  if (value instanceof Date) return value.toISOString().toLowerCase().includes(lowerTerm)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase().includes(lowerTerm)
  }

  if (Array.isArray(value)) {
    return value.some((item, index) => subtreeHasMatch(item, index.toString(), term))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, val]) =>
      subtreeHasMatch(val, key, term)
    )
  }
  return false
}

const hasSubtreeMatch = computed(() => subtreeHasMatch(props.value, props.name, props.searchTerm))

// Auto-expand matching branches when searching
watch(
  () => props.searchTerm,
  (newTerm) => {
    if (newTerm?.trim() && hasSubtreeMatch.value && isExpandable.value) {
      isExpanded.value = true
    }
  },
  { immediate: true }
)

const entries = computed(() => {
  if (props.type === 'array') {
    return (props.value as unknown[]).map((item, index) => ({
      key: index.toString(),
      value: item,
      type: getType(item),
    }))
  }
  if (props.type === 'object' && props.value !== null) {
    return Object.entries(props.value as object).map(([key, val]) => ({
      key,
      value: val,
      type: getType(val),
    }))
  }
  return []
})

// Filtered children when searching
const filteredEntries = computed(() => {
  if (!props.searchTerm?.trim()) return entries.value
  return entries.value.filter((entry) =>
    subtreeHasMatch(entry.value, entry.key, props.searchTerm!)
  )
})

// Item count (respects search filter when collapsed)
const itemCount = computed(() => {
  if (!props.searchTerm?.trim()) {
    if (props.type === 'array') return (props.value as unknown[]).length
    if (props.type === 'object' && props.value !== null) return Object.keys(props.value as object).length
    return 0
  }
  return filteredEntries.value.length
})

function getType(val: unknown): string {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  return typeof val
}

function handleRowClick() {
  if (isExpandable.value && !isSwiping.value) {
    isExpanded.value = !isExpanded.value
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (isExpandable.value && !isSwiping.value) {
    isExpanded.value = !isExpanded.value
    e.preventDefault()
  }
}

async function copyValue() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.value, null, 2))
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
<div :class="cn(level > 0 && 'border-l border-border pl-3 ml-2')">
  <div ref="rowRef" class="flex items-start gap-2 py-0.5 rounded px-1 -mx-1"
    :class="{ 'bg-accent/50': isDirectlyHovered, 'cursor-pointer': isExpandable }"
    @mouseenter="isDirectlyHovered = true" @mouseleave="isDirectlyHovered = false" @click="handleRowClick"
    @touchend.stop="handleTouchEnd">
    <!-- ... (chevron, name, value, copy button — unchanged) ... -->
    <div v-if="isExpandable" :class="cn('mt-0.5 text-muted-foreground')">
      <ChevronDown v-if="isExpanded" :size="16" />
      <ChevronRight v-else :size="16" />
    </div>
    <div v-else class="w-3" />

    <div class="flex-1 min-w-0 mt-0.5">
      <div class="flex items-baseline gap-2 flex-wrap min-w-0">
        <span class="text-secondary-foreground font-semibold wrap-break-word min-w-0 text-xs">{{ name }}:</span>

        <template v-if="!isExpandable">
          <JsonValue :value="value" :type="type" />
        </template>

        <template v-else>
          <span v-if="!isExpanded" class="text-muted-foreground text-xs">
            {{ type === 'array' ? '[' : '{' }}
            {{ itemCount }}
            {{ itemCount === 1 ? 'item' : 'items' }}
            {{ type === 'array' ? ']' : '}' }}
          </span>
          <span v-else class="text-muted-foreground text-xs">
            {{ type === 'array' ? '[' : '{' }}
          </span>
        </template>
      </div>
    </div>

    <div class="shrink-0 w-5.5 h-5.5 rounded hover:bg-accent flex items-center justify-center">
      <button v-if="isDirectlyHovered" @click="copyValue" class="text-muted-foreground hover:text-foreground">
        <Check v-if="copied" :size="14" class="text-green-500" />
        <Copy v-else :size="14" />
      </button>
    </div>
  </div>

  <!-- Children (only matching ones when searching) -->
  <div v-if="isExpanded && isExpandable" class="mt-1">
    <JsonNode v-for="entry in filteredEntries" :key="entry.key" :name="entry.key" :value="entry.value"
      :type="entry.type" :level="level + 1" :default-expanded="defaultExpanded"
      :default-expanded-level="defaultExpandedLevel" :search-term="searchTerm" />
    <div class="text-muted-foreground py-0.5">
      {{ type === 'array' ? ']' : '}' }}
    </div>
  </div>

  <!-- No results message for root only -->
  <div v-if="searchTerm?.trim() && level === 0 && !hasSubtreeMatch"
    class="text-muted-foreground text-xs pl-6 py-1 italic">
    No matches found for "{{ searchTerm }}"
  </div>
</div>
</template>