<script setup lang="ts">
import { useLastAppearedStore } from '../stores/lastAppeared';
import { provisionDisplayTag } from '../utils';
import { computed } from 'vue';

defineProps<{
  visible: boolean;
}>();

const store = useLastAppearedStore();

const displayText = computed(() => {
  if (!store.provisionTag || !store.provisionType) return '';

  const header = store.header;
  const enumVal = store.enumText;
  const type = store.provisionType;

  return provisionDisplayTag(store.provisionTag, type, header, enumVal);
});
</script>

<template>
<Transition name="provision-chip">
  <div v-if="visible && displayText"
    class="lg:hidden fixed top-14 left-0 right-0 z-20 bg-background/80 backdrop-blur-sm border-y dark:border-zinc-800">
    <div class="px-4 py-1.5 text-xs text-secondary-foreground truncate">
      {{ displayText }}
    </div>
  </div>
</Transition>
</template>

<style scoped>
.provision-chip-enter-active,
.provision-chip-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.provision-chip-enter-from,
.provision-chip-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
