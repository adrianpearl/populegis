<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { provisionsDBtoDisplayChunk } from '../utils/index.ts';
import TocItem from './TocItem.vue';
import Loader from './Loader.vue';
import type { DisplayProvision } from '../utils';
import { useApi } from '@/composables/useApi';

const props = defineProps({
  packageid: {
    type: String,
    required: true
  }
});

const { data: rows, isLoading: provisionsLoading, run } = useApi<DisplayProvision[]>([]);
const provisionsRoot = computed(() =>
  rows.value.length ? provisionsDBtoDisplayChunk(rows.value, 1) : undefined,
);

let requestId = 0;

watch(() => props.packageid, (packageid) => {
  if (!packageid) return;
  run(`/api/provisions?${new URLSearchParams({ packageid, levelLte: '4' })}`);
}, { immediate: true });
</script>

<template>
<div v-if="provisionsLoading" class="py-6 w-full">
  <div class="mx-auto w-min">
    <Loader />
  </div>
</div>
<TocItem v-if="provisionsRoot" :provision="provisionsRoot" :next-non-descendant="10 ** 7" :color-coded="false" />
</template>