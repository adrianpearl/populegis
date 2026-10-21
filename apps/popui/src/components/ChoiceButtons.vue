<!-- ChoiceButtons.vue -->
<script setup lang="ts" generic="T extends string | number">
import { Button } from '@/components/ui/button';

const props = defineProps<{
  options: T[];
  multiple?: boolean;
}>();

const model = defineModel<T | T[] | undefined>();

function isSelected(value: T): boolean {
  if (props.multiple) {
    return Array.isArray(model.value) && model.value.includes(value);
  }
  return model.value === value;
}

function toggle(value: T) {
  if (props.multiple) {
    const current = Array.isArray(model.value) ? [...model.value] : [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    model.value = next;          // always an array, never undefined
  } else {
    model.value = model.value === value ? undefined : value;
  }
}
</script>

<template>
<div class="flex flex-wrap gap-1.5">
  <Button v-for="option of options" :key="String(option)" size="xs" type="button" class="border border-muted-foreground"
    :class="isSelected(option)
      ? 'bg-primary text-primary-foreground'
      : 'bg-background text-foreground hover:bg-muted'" @click="toggle(option)">
    {{ option }}
  </Button>
</div>
</template>