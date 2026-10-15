<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, flip, shift, offset } from '@floating-ui/vue'
import type { Placement } from '@floating-ui/vue'

// Define props with an optional placement restricted to Floating UI types
const props = withDefaults(
  defineProps<{
    content: string
    placement?: Placement
  }>(),
  {
    placement: 'bottom',
  }
)

const reference = ref(null)
const floating = ref(null)
const isVisible = ref(false)

// Pass the prop directly using a getter function for standard Vue reactivity
const { floatingStyles } = useFloating(reference, floating, {
  placement: () => props.placement,
  middleware: [offset(8), flip(), shift()],
})
</script>

<template>
  <div class="inline-block" @mouseenter="isVisible = true" @mouseleave="isVisible = false">
    <!-- The element triggering the tooltip -->
    <div ref="reference">
      <slot />
    </div>

    <!-- Teleport ensures the tooltip mounts safely outside layout overflows -->
    <Teleport to="body" v-if="isVisible">
      <div
        ref="floating"
        :style="floatingStyles"
        class="z-50 bg-neutral-900 text-neutral-50 px-2 py-1 text-xs rounded shadow-md pointer-events-none"
      >
        {{ content }}
      </div>
    </Teleport>
  </div>
</template>