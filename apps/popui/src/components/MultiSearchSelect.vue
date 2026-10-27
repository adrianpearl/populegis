<template>
<Popover v-model:open="open">
  <PopoverTrigger as-child>
    <button type="button"
      class="flex min-h-9 w-full items-center justify-between gap-1 rounded-sm border border-input bg-background dark:bg-muted/20 px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      :aria-expanded="open" :aria-label="placeholder">
      <div class="flex flex-1 flex-wrap items-center gap-1 min-w-0">
        <template v-if="selected.length">
          <template v-if="selected.length <= 5">
            <span v-for="value in selected" :key="value"
              class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              <span class="truncate max-w-35">{{ labelFor(value) }}</span>
              <button type="button"
                class="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                @click.stop="toggle(value)">
                <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </span>
          </template>
          <span v-else class="truncate text-sm">{{ selected.length }} selected</span>
        </template>
        <span v-else class="text-muted-foreground">{{ placeholder }}</span>
      </div>
      <ChevronsUpDown class="ml-1 h-4 w-4 shrink-0 opacity-50" />
    </button>
  </PopoverTrigger>

  <PopoverContent class="p-0 max-w-[100vw]"
    :class="mobile ? 'w-[calc(100vw-2rem)]' : 'w-(--reka-popover-trigger-width)'" side="bottom" :side-offset="4"
    align="start" :avoid-collisions="!mobile" :collision-padding="16">
    <Command>
      <CommandInput v-model="searchQuery" :placeholder="placeholder" class="border-none focus:ring-0" />
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandList class="max-h-60 overflow-y-auto">
        <!-- Selected first -->
        <CommandGroup v-if="selectedInView.length">
          <CommandItem v-for="option in selectedInView" :key="`selected-${option.value}`" :value="option.value"
            @select="toggle(option.value)">
            <Check class="mr-2 h-4 w-4 shrink-0 opacity-100" />
            <span class="block wrap-break-word overflow-wrap-anywhere min-w-0 flex-1">{{ option.label }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator v-if="selectedInView.length && hasUnselected" />

        <!-- Unselected, grouped by section -->
        <template v-for="group in unselectedGroups" :key="group.section ?? 'none'">
          <CommandGroup v-if="group.options.length">
            <div v-if="group.section" class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {{ group.section }}
            </div>
            <CommandItem v-for="option in group.options" :key="option.value" :value="option.value"
              @select="toggle(option.value)">
              <Check class="mr-2 h-4 w-4 shrink-0 opacity-0" />
              <span class="block wrap-break-word overflow-wrap-anywhere min-w-0 flex-1">{{ option.label }}</span>
            </CommandItem>
          </CommandGroup>
        </template>
      </CommandList>

      <div v-if="remainingCount > 0" class="border-t px-3 py-2 text-xs text-muted-foreground">
        {{ remainingCount }} more {{ remainingCount === 1 ? 'option' : 'options' }} — search to find them
      </div>
    </Command>
  </PopoverContent>
</Popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronsUpDown, X } from '@lucide/vue'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type SelectOption = {
  label: string
  value: string
  section?: string
}

const props = defineProps<{
  options: SelectOption[]
  placeholder: string
  mobile?: boolean
}>()

const model = defineModel<string[] | undefined>({ required: true })

const open = ref(false)
const searchQuery = ref('')
const LIMIT = 20

const selected = computed({
  get: () => model.value ?? [],
  set: (value: string[]) => {
    model.value = value.length ? value : undefined
  },
})

const labelMap = computed(() => {
  const map = new Map<string, string>()
  for (const opt of props.options) map.set(opt.value, opt.label)
  return map
})

function labelFor(value: string) {
  return labelMap.value.get(value) ?? value
}

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(
    (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  )
})

const selectedSet = computed(() => new Set(selected.value))

const selectedInView = computed(() =>
  filteredOptions.value.filter((o) => selectedSet.value.has(o.value)).slice(0, LIMIT),
)

const unselectedGroups = computed(() => {
  const unselected = filteredOptions.value.filter((o) => !selectedSet.value.has(o.value))
  const order: (string | undefined)[] = []
  const map = new Map<string | undefined, SelectOption[]>()

  for (const o of unselected) {
    if (!map.has(o.section)) {
      map.set(o.section, [])
      order.push(o.section)
    }
    const list = map.get(o.section)!
    if (selectedInView.value.length + list.length < LIMIT) list.push(o)
  }

  return order.map((section) => ({ section, options: map.get(section) ?? [] }))
})

const hasUnselected = computed(() =>
  unselectedGroups.value.some((g) => g.options.length > 0),
)

const remainingCount = computed(() => {
  const shown =
    selectedInView.value.length +
    unselectedGroups.value.reduce((n, g) => n + g.options.length, 0)
  return Math.max(0, filteredOptions.value.length - shown)
})

function toggle(value: string) {
  const current = selected.value
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value]
  selected.value = next
  searchQuery.value = ''
}
</script>