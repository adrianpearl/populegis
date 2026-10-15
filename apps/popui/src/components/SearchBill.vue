<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Input } from '@/components/ui/input';
import Loader from './Loader.vue';
import { provisionDisplayTag } from '@/utils';
import { watchDebounced } from '@vueuse/core';
import { getBillBasePath } from '@/utils/billPath';
import { useApi } from '@/composables/useApi';

const props = defineProps({
  packageid: { type: String, required: true },
  mobile: { type: Boolean, default: false },
});

const basePath = getBillBasePath(props.packageid);
const searchQueryRaw = ref('');
const searchQuery = ref('');
const { data: provisions, isLoading: provisionsLoading, run } = useApi<any[]>([]);

watchDebounced(searchQueryRaw, (value) => {
  searchQuery.value = value.trim();
  if (searchQuery.value.length <= 3) {
    provisions.value = [];
    return;
  }
  const params = new URLSearchParams({
    packageid: props.packageid,
    q: searchQuery.value,
    limit: '50',
  });
  run(`/api/provisions?${params}`);
}, { debounce: 750 });

const queryPattern = computed(() => new RegExp(escapeRegExp(searchQuery.value), 'i'));

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchSnippet(provisionText: string, query: string) {
  const textBody = provisionText.replace(/<[^>]+>/g, '');
  const queryMatch = textBody.match(new RegExp(escapeRegExp(query), 'i'));
  if (!queryMatch || queryMatch.index == null) return '';
  const snippetBegin = Math.max(queryMatch.index - 50, 0);
  const snippetEnd = Math.min(queryMatch.index + queryMatch[0].length + 50, textBody.length);
  const snippet = textBody
    .slice(snippetBegin, snippetEnd)
    .replace(
      new RegExp(escapeRegExp(query), 'gi'),
      (hit) => `<span class="bg-yellow-400 dark:bg-yellow-800">${hit}</span>`,
    );
  return (snippetBegin === 0 ? '' : '...') + snippet + (snippetEnd === textBody.length ? '' : '...');
}
</script>

<template>
  <Input ref="searchInput" name="md-search-input" placeholder="Search provisions in this bill" v-model="searchQueryRaw"
    :class="[mobile ? '' : 'ml-px']" />
  <Loader v-if="provisionsLoading" />
  <div v-if="provisions.length" class="py-4 flex flex-col gap-2">
    <RouterLink v-for="provision of provisions" :key="provision.location" :to="`${basePath}/${provision.location}`"
      class="hover:bg-zinc-800/5 dark:hover:bg-zinc-100/10 p-1.5 rounded-sm cursor-pointer">
      <div class="text-gray-700 dark:text-zinc-400 text-xs capitalize mb-0.5">
        {{ provisionDisplayTag(
          provision.provisionTag ?? '',
          provision.provisionType ?? '',
          provision.header?.replace(/<[^>]+>/g, '').trim() ?? null,
          provision.enum?.replace(/<[^>]+>/g, '').trim() ?? null
        ) }}
      </div>
      <div v-if="provision.header && queryPattern.test(provision.header)"
        :innerHTML="matchSnippet(provision.header, searchQuery)" class="font-serif leading-none" />
      <div v-if="provision.text && queryPattern.test(provision.text)"
        :innerHTML="matchSnippet(provision.text, searchQuery)" class="font-serif leading-none" />
    </RouterLink>
  </div>
</template>