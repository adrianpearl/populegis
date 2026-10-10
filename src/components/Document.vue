<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import Provision from '@/components/Provision.vue';
import ProvisionChip from '@/components/ProvisionChip.vue';
import { Button } from '@/components/ui/button';
import { provisionsDBtoDisplayChunk } from '@/utils';
import { Vote } from '@/stores/lastVote';
import type { InferSelectModel } from 'drizzle-orm';
import type { provisions as provisionsTable } from '../db/schema';
import Loader from './Loader.vue';

type ProvisionRow = InferSelectModel<typeof provisionsTable>;

const props = defineProps<{
  documentId: string;
  provisions: ProvisionRow[];
  provisionCount: number;
  location?: number;
  loading: boolean;
  currentVote: Vote;
}>();

const emit = defineEmits<{
  loadMore: [];
  loadPrevious: [];
  vote: [Vote];
}>();

const titleVisible = ref(true);
let titleEndScroll = Infinity;

function handleScroll() {
  if (titleEndScroll === Infinity) {
    const el = document.getElementById('doc-title-end');
    if (el) titleEndScroll = window.scrollY + el.getBoundingClientRect().bottom - 56;
  }
  titleVisible.value = window.scrollY < titleEndScroll;
}
onMounted(() => document.addEventListener('scroll', handleScroll, { passive: true }));
onUnmounted(() => document.removeEventListener('scroll', handleScroll));

const maxLocation = computed(() => Math.max(props.provisionCount - 1, 0));
const minLoaded = computed(() => Math.min(...props.provisions.map((d) => d.location), Infinity));
const maxLoaded = computed(() => Math.max(...props.provisions.map((d) => d.location), -1));

function toDisplay(rows: ProvisionRow[]) {
  const locations = rows.map((d) => d.location);
  const roots = rows.filter((d) => d.parentLocation == d.location || !locations.includes(d.parentLocation ?? -1));
  const rootIdxs = roots.map((d) => rows.indexOf(d));
  return rootIdxs.map((d, i) => provisionsDBtoDisplayChunk(rows.slice(d, rootIdxs[i + 1]), rows[d]?.level ?? 1));
}
const tree = computed(() => toDisplay(props.provisions));
</script>

<template>
  <Loader v-if="loading && provisions.length == 0" />
  <div v-else :class="{ 'opacity-70 animate-pulse': loading }">
    <slot name="header" />
    <div id="doc-title-end" class="my-16 w-1/2 mx-auto"><hr /></div>
    <ProvisionChip :visible="!titleVisible" />
    <slot name="form" />
    <Button v-if="minLoaded > 1" variant="secondary" class="w-5/6 mx-auto my-3" @click="emit('loadPrevious')">
      Load More
    </Button>
    <div class="legis lg:ml-0 px-8 pb-32">
      <div class="lg:hidden ml-4">
        <Provision v-for="provision of tree" :key="provision.location" :provision="provision" :isMobile="true" :currentLocation="location" />
      </div>
      <div class="hidden lg:block">
        <Provision v-for="provision of tree" :key="provision.location" :provision="provision" :isMobile="false" :currentLocation="location" />
      </div>
    </div>
    <Button v-if="maxLoaded < maxLocation" variant="secondary" class="w-5/6 mx-auto" @click="emit('loadMore')">
      Load More
    </Button>
  </div>
</template>