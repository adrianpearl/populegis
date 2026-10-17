<!-- src/views/Governance.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Document from '@/views/Document.vue';
import Toc from '@/components/Toc.vue';
import SearchBill from '@/components/SearchBill.vue';
import { List, FileSearch } from '@lucide/vue';
import { useApi } from '@/composables/useApi';
import { useLastVoteStore, Vote } from '@/stores/lastVote';
import { toast } from 'vue-sonner';
import type { InferSelectModel } from 'drizzle-orm';
import type { governanceDocuments, provisions as provisionsTable } from '@populegis/db';

type Doc = InferSelectModel<typeof governanceDocuments>;
type ProvisionRow = InferSelectModel<typeof provisionsTable>;
type Payload = { document: Doc; provisions: ProvisionRow[]; provisionCount: number };

const props = defineProps({
  documentId: { type: String, default: 'META-1' },
  location: { type: Number, required: false }
});

const { data, isLoading, run } = useApi<Payload | null>(null);
const limit = ref(250);
const backset = ref(100);
const offset = computed(() => props.location ? Math.max(props.location - backset.value, 0) : 0);
const lastVoteStore = useLastVoteStore();
const currentVote = ref<Vote>(Vote.NULL);

// Define exactly what Governance supports
const governanceNavItems = [
  { name: 'Table of Contents', icon: List },
  { name: 'Search Bill', icon: FileSearch }
];

watch([() => props.documentId, offset, limit], () => {
  const params = new URLSearchParams({
    documentId: props.documentId,
    offset: String(offset.value),
    limit: String(limit.value)
  });
  run(`/api/governance?${params}`);
}, { immediate: true });

function onVote(vote: Vote) {
  currentVote.value = vote;
  lastVoteStore.setState(props.documentId, 0, vote);
  toast.info('Your interest in popular government is appreciated.', {
    description: 'Please check back soon for further updates.',
    closeButton: true,
  });
}
</script>

<template>
  <Document 
    :mobile-page-title="data?.document.documentId ?? 'Governance'"
    :provisions="data?.provisions ?? []" 
    :provision-count="data?.provisionCount ?? 0" 
    :location="location" 
    :loading="isLoading" 
    :current-vote="currentVote"
    :nav-items="governanceNavItems"
    @load-more="limit += 100" 
    @load-previous="backset += 50" 
    @vote="onVote"
  >
    <template #pagetitle>
      <div class="max-w-full flex justify-between gap-1">
        <div class="flex gap-2 items-baseline min-w-0 shrink">
          <span class="font-semibold text-base whitespace-nowrap">{{ data?.document.documentId }}</span>
          <span v-if="data?.document.title" class="text-base">|</span>
          <span v-if="data?.document.title" class="font-normal text-base font-serif whitespace-nowrap text-ellipsis overflow-hidden">
            {{ data?.document.title }}
          </span>
        </div>
      </div>
    </template>

    <template #header>
      <div v-if="data" class="px-6 pt-20 font-serif text-3xl lg:text-5xl">{{ data.document.title }}</div>
    </template>

    <!-- This single context slot handles mapping names to correct widgets cleanly -->
    <template #navigationContent="{ activeItem, isMobile }">
      <Toc v-if="activeItem === 'Table of Contents'" :packageid="props.documentId" />
      <SearchBill v-else-if="activeItem === 'Search Bill'" :packageid="props.documentId" :mobile="isMobile" />
    </template>
  </Document>
</template>