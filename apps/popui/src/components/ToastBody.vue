<script setup lang="ts">
import { ref } from 'vue';
import { Copy, Check, CircleCheck, CircleX, Info, TriangleAlert } from '@lucide/vue';
import { twilio_number } from '@/lib/toast';

const props = defineProps<{
  title: string;
  description?: string;
  copyText?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
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
  <Check v-if="copyText && copied" class="size-4 mt-0.5 shrink-0" />
  <Copy v-else-if="copyText" class="size-4 mt-0.5 shrink-0" />
  <CircleCheck v-else-if="type === 'success'" class="size-4 mt-0.5 shrink-0 text-green-600" />
  <CircleX v-else-if="type === 'error'" class="size-4 mt-0.5 shrink-0 text-destructive" />
  <TriangleAlert v-else-if="type === 'warning'" class="size-4 mt-0.5 shrink-0 text-yellow-600" />
  <Info v-else-if="type === 'info'" class="size-4 mt-0.5 shrink-0 text-blue-600" />

  <span class="text-sm">
    <template v-if="copyText">
      Text
      <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{{ copyText }}</span>
      to {{ twilio_number }}
    </template>
    <template v-else>{{ title }}</template>
    <span v-if="description" class="mt-0.5 block text-xs text-muted-foreground">{{ description }}</span>
  </span>
</button></template>