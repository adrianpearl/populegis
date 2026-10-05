<script setup lang="ts">
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'  // ← shadcn-vue Input (add via `npx shadcn-vue add input` if missing)
import { X } from 'lucide-vue-next'
import JsonNode from './JsonNode.vue'

interface Props {
  data: unknown
  rootName?: string
  defaultExpanded?: boolean
  defaultExpandedLevel?: number
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  rootName: 'root',
  defaultExpanded: true,
  defaultExpandedLevel: 1,
})

const searchTerm = ref('')

const rootType = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})
</script>

<template>
<div :class="cn('font-mono text-sm', props.class)">
  <!-- Search interface -->
  <div class="flex items-center gap-2 mb-3">
    <Input v-model="searchTerm" placeholder="Search keys or values..." class="flex-1 font-mono text-xs h-9" />
    <button v-if="searchTerm" @click="searchTerm = ''"
      class="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent" title="Clear search">
      <X :size="18" />
    </button>
  </div>

  <JsonNode :name="rootName" :value="data" :type="rootType" :level="0" :default-expanded="defaultExpanded"
    :default-expanded-level="defaultExpandedLevel" :search-term="searchTerm" />
</div>
</template>