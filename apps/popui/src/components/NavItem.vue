<!-- NavItem.vue -->
<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type { Component } from 'vue';

const props = defineProps<{
  to?: string;
  href?: string;
  icon: Component;
  label?: string;
  action?: () => void;
  large?: boolean;
}>();
</script>

<template><!-- Internal -->
<Button v-if="to" as-child variant="ghost"
  :class="large ? 'w-full justify-start h-12 text-base' : 'w-full justify-start'">
  <router-link :to="to">
    <component :is="icon" :class="large ? 'size-5' : ''" />
    <span v-if="label" :class="large ? 'text-base' : 'text-xs'">{{ label }}</span>
  </router-link>
</Button>

<!-- External -->
<Button v-else-if="href" as-child variant="ghost"
  :class="large ? 'w-full justify-start h-12 text-base' : 'w-full justify-start'">
  <a :href="href" target="_blank" rel="noopener noreferrer">
    <component :is="icon" :class="large ? 'size-5' : ''" />
    <span v-if="label" :class="large ? 'text-base' : 'text-xs'">{{ label }}</span>
  </a>
</Button>

<!-- Action -->
<Button v-else variant="ghost" :class="large ? 'w-full justify-start h-12 text-base' : 'w-full justify-start'"
  @click="action?.()">
  <component :is="icon" :class="large ? 'size-5' : ''" />
  <span v-if="label" :class="large ? 'text-base' : 'text-xs'">{{ label }}</span>
</Button></template>