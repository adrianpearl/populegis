<script setup lang="ts">
import { ref } from 'vue';
import { watchDebounced, onClickOutside } from '@vueuse/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/Loader.vue';
import BillCard from '@/components/BillCard.vue';
import { FolderOpen, Search, X } from '@lucide/vue';
import { useApi } from '@/composables/useApi';
import type { CardBill } from '@/components/BillCard.vue';

defineProps({ mobile: Boolean });
const open = defineModel<boolean>('open', { default: false });

const searchQuery = ref('');
const showSearchResults = ref(false);
const searchResultFocus = ref(false);
const searchContainerRef = ref<HTMLElement | null>(null);
const floating = ref<HTMLElement | null>(null);
const { data: billsResult, isLoading, run } = useApi<CardBill[]>([]);

watchDebounced(searchQuery, (query) => {
  const trimmed = query.trim();
  if (!trimmed) {
    billsResult.value = [];
    return;
  }
  const params = new URLSearchParams({
    filters: JSON.stringify({ title: trimmed, includeOfficialTitle: false, requireForm: true }),
    orderField: 'lastModified',
    orderDir: 'desc',
    limit: '10',
  });
  run(`/api/bills?${params}`);
}, { debounce: 500, maxWait: 1000 });

function handleInputBlur() {
  setTimeout(() => {
    if (!searchResultFocus.value) showSearchResults.value = false;
  }, 150);
}
function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab' && !e.shiftKey && showSearchResults.value && (isLoading.value || billsResult.value.length)) {
    e.preventDefault();
    (floating.value?.querySelector('.search-result-item') as HTMLElement | null)?.focus();
    searchResultFocus.value = true;
  } else if (e.key === 'Escape') {
    showSearchResults.value = false;
    searchResultFocus.value = false;
  }
}
onClickOutside(searchContainerRef, () => {
  showSearchResults.value = false;
  searchResultFocus.value = false;
}, { ignore: [floating] });
</script>

<template>
  <template v-if="mobile">
    <Button size="icon-lg" @click="open = !open" variant="ghost">
      <Search />
    </Button>
    <div v-if="open" class="fixed inset-x-0 top-14 bottom-0 z-21000 overflow-y-scroll bg-background px-3 pb-8 text-primary">
      <div class="flex h-14 items-center justify-between gap-2 mb-2">
        <Input placeholder="Search by bill title" v-model="searchQuery" :initial-focus="true" name="mobile-search-input" />
        <Button variant="ghost" size="icon-lg" @click="open = false"><X /></Button>
      </div>
      <Loader v-if="isLoading" class="w-full p-4" />
      <div v-else-if="searchQuery" class="flex flex-col divide-y">
        <div v-if="!billsResult.length" class="mx-auto text-center py-6 space-y-3">
          <Button variant="secondary" size="icon-lg"><FolderOpen /></Button>
          <div class="text-lg font-semibold">No Bills Found</div>
        </div>
        <BillCard v-for="bill of billsResult" :key="bill.packageid" :bill="bill" context="search" />
      </div>
    </div>
  </template>

  <div v-else ref="searchContainerRef" class="relative w-full">
    <div class="relative w-full items-center">
      <Input id="search" type="text" placeholder="Search..." class="pl-10" v-model="searchQuery"
        @focus="showSearchResults = true" @blur="handleInputBlur" @keydown="handleInputKeydown" />
      <span class="absolute inset-s-0 inset-y-0 flex items-center justify-center px-2">
        <Search class="size-5 text-muted-foreground" />
      </span>
    </div>
    <div v-if="showSearchResults && (isLoading || searchQuery)"
      class="absolute top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-2 shadow-md">
      <Loader v-if="isLoading" />
      <div v-else-if="billsResult.length" class="flex flex-col divide-y">
        <div v-for="bill of billsResult" :key="bill.packageid"
          class="search-result-item cursor-pointer hover:bg-accent focus:bg-accent focus:outline-none" tabindex="0"
          @mouseenter="searchResultFocus = true" @mouseleave="searchResultFocus = false">
          <BillCard :bill="bill" context="search" class="w-full" />
        </div>
      </div>
      <div v-else class="mx-auto text-center py-6 space-y-3">
        <Button variant="secondary" size="icon-lg"><FolderOpen /></Button>
        <div class="text-lg font-semibold">No Bills Found</div>
      </div>
    </div>
  </div>
</template>