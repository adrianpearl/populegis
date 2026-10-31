<script setup lang="ts">
import { ref, watch } from 'vue';
import { watchDebounced, onClickOutside } from '@vueuse/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loader from '@/components/Loader.vue';
import BillCard from '@/components/BillCard.vue';
import { FolderOpen, Search, X } from '@lucide/vue';
import { useApi } from '@/composables/useApi';
import type { CardBill } from '@/components/BillCard.vue';
import { useRoute } from 'vue-router';

const route = useRoute();

defineProps({ mobile: Boolean, disabled: Boolean });
const open = defineModel<boolean>('open', { default: false });

const searchQuery = ref('');
const showSearchResults = ref(false);
const searchResultFocus = ref(false);
const searchContainerRef = ref<HTMLElement | null>(null);
const floating = ref<HTMLElement | null>(null);
const { data: billsResult, isLoading, run } = useApi<CardBill[]>([]);

const HISTORY_KEY = 'bill-search-history';
const history = ref<string[]>(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));

function remember(query: string) {
  const q = query.trim();
  if (!q) return;
  if (q.length < 3) return;
  history.value = [q, ...history.value.filter(h => h !== q)].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}

function useHistory(q: string) {
  searchQuery.value = q;
  showSearchResults.value = true;
}

watch(() => route.fullPath, () => {
  open.value = false;
  showSearchResults.value = false;
});

// only store queries that actually returned results
watch(billsResult, (results) => {
  const q = searchQuery.value.trim();
  if (q && results.length) remember(q);
});

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

<template><template v-if="mobile">
  <Button size="icon-lg" @click="open = !open" variant="ghost" :disabled="disabled">
    <Search />
  </Button>
  <Teleport to="body">
    <div v-if="open"
      class="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-scroll bg-background px-3 pb-8 text-primary">
      <div class="flex h-14 items-center justify-between gap-2 mb-2">
        <Input placeholder="Search by bill title" v-model="searchQuery" :initial-focus="true"
          name="mobile-search-input" />
        <Button variant="ghost" size="icon-lg" @click="open = false">
          <X />
        </Button>
      </div>

      <div v-if="!searchQuery && history.length" class="flex flex-col px-1">
        <div class="text-xs text-muted-foreground mb-1">Recent</div>
        <button v-for="q in history" :key="q" type="button" class="py-2 text-left text-sm border-b"
          @click="useHistory(q)">
          {{ q }}
        </button>
      </div>

      <Loader v-else-if="isLoading" class="w-full p-4" />
      <div v-else-if="searchQuery" class="flex flex-col divide-y">
        <div v-if="!billsResult.length" class="mx-auto text-center py-6 space-y-3">
          <Button variant="secondary" size="icon-lg">
            <FolderOpen />
          </Button>
          <div class="text-lg font-semibold">No Bills Found</div>
        </div>
        <div v-for="bill of billsResult" :key="bill.packageid" @click="remember(searchQuery)">
          <BillCard :bill="bill" context="search" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<div v-else ref="searchContainerRef" class="relative w-full">
  <div class="relative w-full items-center">
    <Input id="search" type="text" placeholder="Search..." class="pl-10" v-model="searchQuery"
      @focus="showSearchResults = true" @blur="handleInputBlur" @keydown="handleInputKeydown" />
    <span class="absolute inset-s-0 inset-y-0 flex items-center justify-center px-2">
      <Search class="size-5 text-muted-foreground" />
    </span>
  </div>

  <div v-if="showSearchResults && !searchQuery && history.length"
    class="absolute top-full z-50 mt-2 w-full rounded-md border bg-popover p-2 shadow-md">
    <div class="px-2 py-1 text-xs text-muted-foreground">Recent</div>
    <button v-for="q in history" :key="q" type="button"
      class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent" @mousedown.prevent="useHistory(q)">
      {{ q }}
    </button>
  </div>

  <div v-else-if="showSearchResults && (isLoading || searchQuery)"
    class="absolute top-full z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-2 shadow-md">
    <Loader v-if="isLoading" />
    <div v-else-if="billsResult.length" class="flex flex-col divide-y">
      <div v-for="bill of billsResult" :key="bill.packageid"
        class="search-result-item cursor-pointer hover:bg-accent focus:bg-accent focus:outline-none" tabindex="0"
        @mouseenter="searchResultFocus = true" @mouseleave="searchResultFocus = false" @click="remember(searchQuery)">
        <BillCard :bill="bill" context="search" class="w-full" />
      </div>
    </div>
    <div v-else class="mx-auto text-center py-6 space-y-3">
      <Button variant="secondary" size="icon-lg">
        <FolderOpen />
      </Button>
      <div class="text-lg font-semibold">No Bills Found</div>
    </div>
  </div>
</div>
</template>