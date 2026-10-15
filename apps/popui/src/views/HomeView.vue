<script setup lang="ts">
import { ArrowDownWideNarrow, FolderOpen, Funnel } from '@lucide/vue';
import Shell from './Shell.vue';
import BillCard from '@/components/BillCard.vue';
import BillFilters from '@/components/BillFilters.vue';
import { type BillSearch } from '@populegis/shared';
import Loader from '@/components/Loader.vue';
import { Button } from '@/components/ui/button';
import { useRoute, useRouter } from 'vue-router';
import { ref, watch } from 'vue';
import type { InferSelectModel } from 'drizzle-orm';
import type { bills } from '@populegis/db';
import { useHead } from '@unhead/vue';
import { useApi } from '@/composables/useApi';

// 1. Establish strict TypeScript interfaces inferred directly from your schema
export type Bill = InferSelectModel<typeof bills>

const emptyFilters = (): BillSearch => ({
  congress: [],
  originChamber: '',
  billTypes: [],
  number: undefined,
  title: '',
  includeOfficialTitle: true,
  versions: [],
  sponsorName: '',
  appropriationsOnly: false,
  policyArea: '',
  legislativeSubject: '',
});

const route = useRoute();
const router = useRouter();

function readFilters(raw: unknown): BillSearch {
  if (typeof raw !== 'string' || !raw) return emptyFilters();
  try {
    return { ...emptyFilters(), ...JSON.parse(raw) };
  } catch {
    return emptyFilters();
  }
}

function compactFilters(value: BillSearch): Partial<BillSearch> {
  const empty = emptyFilters();
  return Object.fromEntries(
    Object.entries(value).filter(([key, v]) => JSON.stringify(v) !== JSON.stringify(empty[key as keyof BillSearch])),
  );
}

const filters = ref<BillSearch>(readFilters(route.query.filters));
type OrderField = 'dateIssued' | 'lastModified' | 'lastAction' | 'lastUpdate';
const orderField = ref<OrderField>(
  (route.query.orderField as OrderField) || 'dateIssued',
);
const orderDir = ref<'asc' | 'desc'>(
  route.query.orderDir === 'asc' ? 'asc' : 'desc',
);

const { data: billList, isLoading, error: fetchError, hasMore, run } = useApi<Bill[]>([]);
const loadingMore = ref(false);

function billsUrl(offset = 0) {
  const params = new URLSearchParams({
    filters: JSON.stringify(compactFilters(filters.value)),
    orderField: orderField.value,
    orderDir: orderDir.value,
    limit: '10',
    offset: String(offset),
  });
  return `/api/bills?${params}`;
}

// UI -> route. Deep because BillFilters mutates nested fields.
watch([filters, orderField, orderDir], () => {
  const next = {
    ...route.query,
    filters: JSON.stringify(compactFilters(filters.value)),
    orderField: orderField.value,
    orderDir: orderDir.value,
  };
  if (JSON.stringify(next) === JSON.stringify(route.query)) return;
  router.replace({ query: next });
}, { deep: true });

// Route -> UI + fetch. The equality check stops the replace from looping.
watch(() => route.query, () => {
  const parsed = readFilters(route.query.filters);
  if (JSON.stringify(parsed) !== JSON.stringify(filters.value)) filters.value = parsed;
  const field = route.query.orderField;
  if (field === 'dateIssued' || field === 'lastModified' || field === 'lastAction' || field === 'lastUpdate') {
    orderField.value = field;
  }
  orderDir.value = route.query.orderDir === 'asc' ? 'asc' : 'desc';
  run(billsUrl());
}, { immediate: true });

async function loadMore() {
  loadingMore.value = true;
  await run(billsUrl(billList.value.length), { append: true });
  loadingMore.value = false;
}

useHead({
  title: 'Browse Federal Bills & Legislation',
  titleTemplate: '%s - Popular Legislation',
  meta: [
    {
      name: 'description',
      content: 'A public intelligence operation where citizens vote on federal legislation and provisions. Read bills, cast votes, and create a public record of civic participation.',
    },
  ],
});
</script>

<template>
<Shell mobile-page-title="Home">
  <template #pagetitle>
    <span class="font-semibold text-2xl">Home</span>
  </template>
  <template #main>
    <div class="lg:hidden">
      <BillFilters v-model="filters" mobile />
    </div>
    <div v-if="!isLoading && !billList.length" class="mx-auto text-center py-6 space-y-3">
      <Button variant="secondary" size="lg">
        <FolderOpen />
      </Button>
      <div class="text-lg font-semibold">No Bills Found</div>
    </div>
    <div class="flex flex-col divide-y px-4 lg:px-0" :class="isLoading ? 'animate-pulse' : ''">
      <BillCard v-for="bill in billList" :key="bill.packageid" :bill="bill" />
    </div>
    <div v-if="isLoading" class="py-6 w-full">
      <div class="mx-auto w-min">
        <Loader />
      </div>
    </div>
    <div v-if="hasMore" class="w-full flex items-center" @click="loadMore">
      <Button variant="secondary" class="my-4 w-5/6 mx-auto">Load More</Button>
    </div>
  </template>
  <template #sidebar>
    <div class="flex flex-col divide-y-2 dark:divide-gray-500">
      <div class="text-gray-700 dark:text-zinc-300 py-3 px-2">
        <div class="flex gap-2 items-center mb-2">
          <ArrowDownWideNarrow :size="18" />
          <span>Order By</span>
        </div>
        <div class="flex gap-2">
          <select v-model="orderField"
            class="p-2 rounded-sm bg-white dark:bg-transparent border dark:border-gray-600 text-xs">
            <option value="dateIssued">Date Issued</option>
            <option value="lastModified">Last Modified</option>
            <option value="lastAction">Last Action</option>
            <option value="lastUpdate">Last Update</option>
          </select>
          <select v-model="orderDir"
            class="p-2 rounded-sm bg-white dark:bg-transparent border dark:border-gray-600 text-xs">
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </div>
      </div>
      <div class="text-gray-700 dark:text-zinc-300 py-3 px-2">
        <div class="flex gap-2 items-center mb-2">
          <Funnel :size="18" />
          <span>Filter</span>
        </div>
        <BillFilters v-model="filters" />
      </div>
    </div>
  </template>
</Shell>
</template>