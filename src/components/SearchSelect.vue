<template>
<Combobox v-model="selectedOption" :open="open" @update:open="handleOpenChange">
  <div class="relative">
    <ComboboxAnchor as-child>
      <ComboboxTrigger
        class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background dark:bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="mobile ? '' : ''" role="combobox" :aria-expanded="open" :aria-label="placeholder">
        <span v-if="selectedOption" class="block truncate">
          {{ selectedOption }}
        </span>
        <span v-else class="text-muted-foreground">
          {{ placeholder }}
        </span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxList class="p-0 max-w-[100vw]!"
      :class="mobile ? 'w-[calc(100vw-2rem)]!' : 'w-(--reka-combobox-trigger-width)'"
      :side="mobile ? 'bottom' : 'bottom'" :align="mobile ? 'start' : 'start'" :avoid-collisions="!mobile">
      <ComboboxInput v-model="searchQuery" :placeholder="placeholder"
        :class="mobile ? 'text-base border-none focus:ring-0 focus:ring-offset-0' : 'border-none focus:ring-0 focus:ring-offset-0'"
        @blur="handleInputBlur" />

      <ComboboxEmpty class="py-6 text-center text-sm text-muted-foreground">
        No results found.
      </ComboboxEmpty>

      <ComboboxViewport class="max-h-50 overflow-y-auto overflow-x-hidden p-1">
        <ComboboxItem v-for="option in filteredOptions" :key="option" :value="option"
          class="relative flex cursor-default select-none items-start! rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground min-w-0 max-w-full">
          <Check :class="cn(
            'mr-2 h-4 w-4 shrink-0 mt-0.5',
            selectedOption === option ? 'opacity-100' : 'opacity-0'
          )" />
          <span class="block wrap-break-word overflow-wrap-anywhere min-w-0 flex-1">{{ option }}</span>
        </ComboboxItem>
      </ComboboxViewport>
    </ComboboxList>
  </div>
</Combobox>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronsUpDown } from '@lucide/vue'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

// Props - same API as original SearchSelect
const props = defineProps<{
  options: string[]
  placeholder: string
  mobile?: boolean
}>()

// Model
const selectedOption = defineModel<string>({ required: true })

// Internal state
const open = ref(false)
const searchQuery = ref('')

// Computed
const filteredOptions = computed(() => {
  if (searchQuery.value === '') {
    return props.options.slice(0, 30)
  }
  return props.options
    .filter((option) =>
      option.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .slice(0, 30)
})

// Methods
function handleOpenChange(newOpen: boolean) {
  open.value = newOpen
  if (!newOpen) {
    searchQuery.value = ''
  }
}

function handleInputBlur() {
  // Clear search when input loses focus (similar to original behavior)
  setTimeout(() => {
    if (!open.value) {
      searchQuery.value = ''
    }
  }, 100)
}

// Watch for selection changes to clear search (like original)
watch(selectedOption, () => {
  searchQuery.value = ''
})
</script>