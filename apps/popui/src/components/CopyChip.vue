<script setup lang="ts">
import { ref } from 'vue';
import { Copy, Check } from '@lucide/vue';

const props = defineProps<{ text: string }>();
const copied = ref(false);

async function doCopy() {
  const ta = document.createElement('textarea');
  ta.value = props.text;
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

<template><button type="button" class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
  @click.stop="doCopy">
  {{ text }}
  <Check v-if="copied" class="size-3" />
  <Copy v-else class="size-3" />
</button></template>