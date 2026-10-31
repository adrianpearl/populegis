<script setup lang="ts">
import { ref } from 'vue';
import { Copy, Check } from '@lucide/vue';

const props = defineProps<{
  title: string;
  description?: string;
  copyText?: string;
}>();

const copied = ref(false);

function doCopy() {
  if (!props.copyText) return;
  const ta = document.createElement('textarea');
  ta.value = props.copyText;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  // deprecated but required for iOS Firefox
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (ok) {
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  }
}
</script>

<template><button type="button" class="flex items-start gap-2 w-full text-left" :class="copyText ? '' : 'pointer-events-none'"
  @click.stop="doCopy">
  <template v-if="copyText">
    <Check v-if="copied" class="size-4 mt-0.5 shrink-0" />
    <Copy v-else class="size-4 mt-0.5 shrink-0" />
  </template>
  <span class="text-sm">
    {{ title }}
    <span v-if="description" class="mt-0.5 block text-xs text-muted-foreground">
      <template v-if="copyText">
        Text
        <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{{ copyText }}</span>
        {{ description }}
      </template>
      <template v-else>{{ description }}</template>
    </span>
  </span>
</button></template>