<script setup lang="ts">
import { ArrowDownWideNarrow, FolderOpen, Funnel } from '@lucide/vue';
import Shell from './Shell.vue';
import BillCard from '@/components/BillCard.vue';
import BillFilters from '@/components/BillFilters.vue';
import { type BillSearch } from '../../shared/bills.ts';
import Loader from '@/components/Loader.vue';
import { Button } from '@/components/ui/button';
import { useRoute, useRouter } from 'vue-router';
import { ref, watch, onMounted, computed } from 'vue';
import type { InferSelectModel } from 'drizzle-orm';
import type { bills } from '../db/schema';
import { useHead } from '@unhead/vue';

// 1. Establish strict TypeScript interfaces inferred directly from your schema
export type Bill = InferSelectModel<typeof bills>

// 2. Pure browser-reactive references
const billList = ref<Bill[]>([])
const isLoading = ref(true)
const fetchError = ref<string | null>(null)

// 3. Dynamic client-side fetch loop running safely inside the browser window
onMounted(async () => {
  try {
    const response = await fetch('/api/bills')
    if (!response.ok) throw new Error('Network payload resolution error')

    billList.value = await response.json()
  } catch (err: any) {
    fetchError.value = err.message || 'An error occurred while fetching legislative data.'
  } finally {
    isLoading.value = false
  }
})

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
const filters = ref<BillSearch>(emptyFilters());
const orderField = ref<'dateIssued' | 'lastModified' | 'lastAction' | 'lastUpdate'>('dateIssued');
const orderDir = ref<'asc' | 'desc'>('desc');
const loadingMore = ref(false);
const canLoadMore = ref(false);

watch(filters, (next) => {
  router.replace({ query: { filters: JSON.stringify(next) } });
});

const loading = computed(() => isLoading);

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
    <div v-if="!loading && !billList.length" class="mx-auto text-center py-6 space-y-3">
      <Button variant="secondary" size="lg">
        <FolderOpen />
      </Button>
      <div class="text-lg font-semibold">No Bills Found</div>
    </div>
    <div class="flex flex-col divide-y px-4 lg:px-0">
      <BillCard v-for="bill in billList" :key="bill.packageid" :bill="bill" />
    </div>
    <div v-if="loading" class="py-6 w-full">
      <div class="mx-auto w-min">
        <Loader />
      </div>
    </div>
    <div v-if="canLoadMore" class="w-full flex items-center">
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