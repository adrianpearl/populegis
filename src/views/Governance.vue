<!-- src/views/Governance.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Shell from './Shell.vue';
import Document from '@/components/Document.vue';
import Toc from '@/components/Toc.vue';
import { useApi } from '@/composables/useApi';
import { useLastVoteStore, Vote } from '@/stores/lastVote';
import { toast } from 'vue-sonner';
import type { InferSelectModel } from 'drizzle-orm';
import type { governanceDocuments, provisions as provisionsTable } from '../db/schema';

type Doc = InferSelectModel<typeof governanceDocuments>;
type ProvisionRow = InferSelectModel<typeof provisionsTable>;
type Payload = { document: Doc; provisions: ProvisionRow[]; provisionCount: number };

const props = defineProps({
  documentId: {
    type: String,
    default: 'META-1'
  },
  location: {
    type: Number,
    required: false
  }
});

const { data, isLoading, run } = useApi<Payload | null>(null);
const limit = ref(250);
const backset = ref(100);
const offset = computed(() => props.location ? Math.max(props.location - backset.value, 0) : 0);
const lastVoteStore = useLastVoteStore();
const currentVote = ref<Vote>(Vote.NULL);

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
  toast.info('Your interest in popular government is appreciated.', { closeButton: true });
}
</script>

<template>
<Shell :mobile-page-title="data?.document.documentId ?? 'Governance'" :page-loading="isLoading">
  <template #pagetitle>
    <div class="max-w-full flex justify-between gap-1">
      <div class="flex gap-2 items-baseline min-w-0 shrink">
        <span class="font-semibold text-base whitespace-nowrap">{{ data?.document.documentId }}</span>
        <span v-if="data?.document.title" class="text-base">|</span>
        <span v-if="data?.document.title"
          class="font-normal text-base font-serif whitespace-nowrap text-ellipsis overflow-hidden">{{
            data?.document.title
          }}</span>
      </div>
    </div>
  </template>
  <template #main>
    <Document v-if="data" :document-id="props.documentId" :provisions="data.provisions"
      :provision-count="data.provisionCount" :location="location" :loading="isLoading" :current-vote="currentVote"
      @load-more="limit += 100" @load-previous="backset += 50" @vote="onVote">
      <template #header>
        <div class="px-6 pt-20 font-serif text-3xl lg:text-5xl">{{ data.document.title }}</div>
      </template>
    </Document>
  </template>
  <template #sidebar>
    <Toc :packageid="props.documentId" />
  </template>
</Shell>
</template>