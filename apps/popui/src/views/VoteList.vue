<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import Shell from './Shell.vue';
import BillCard, { type CardBill } from '../components/BillCard.vue';
import BillFilters from '../components/BillFilters.vue';
import Loader from '@/components/Loader.vue';
import { Button } from '@/components/ui/button';
import { ArrowDownWideNarrow, Funnel, FolderOpen, Check, Ban, Minus } from '@lucide/vue';
import { Vote } from '@/stores/lastVote';
import { pTagBreadcrumbs } from '@/utils';
import { useHead } from '@unhead/vue';
import { useApi } from '@/composables/useApi';
import type { BillSearch } from '@populegis/shared';

type User = { firstname: string | null; lastname: string | null; state: string | null; district: string | null };
type Subvote = { location: number; voteOption: string; provision: { provisionTag: string | null; header: string | null } | null };
type VotedBill = CardBill & { packageid: string; vote: string | null; subprovisionVotes: Subvote[] };
type Payload = { user: User | null; bills: VotedBill[] };

const route = useRoute();
const username = computed(() => String(route.params.username));
const orderField = ref('dateIssued');
const orderDir = ref<'asc' | 'desc'>('desc');
const { data, isLoading, hasMore, run } = useApi<Payload>({ user: null, bills: [] });

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
  legislativeSubjects: [],
  memberNames: undefined,
  searchSponsors: true,
  searchCosponsors: false,
  // add any new fields BillFilters now writes (committeeSystemCodes, etc.)
});

function compactFilters(value: BillSearch): Partial<BillSearch> {
  const empty = emptyFilters();
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, v]) => JSON.stringify(v) !== JSON.stringify(empty[key as keyof BillSearch]),
    ),
  );
}

const filters = ref<BillSearch>(emptyFilters());

const query = computed(() => {
  const params = new URLSearchParams({
    orderField: orderField.value,
    orderDir: orderDir.value,
    limit: '10',
  });
  const compact = compactFilters(filters.value);
  if (Object.keys(compact).length) {
    params.set('filters', JSON.stringify(compact));
  }
  return `/api/users/${encodeURIComponent(username.value)}/votes?${params}`;
});

watch(query, (url) => run(url), { immediate: true });

async function loadMore() {
  const response = await fetch(`${query.value}&offset=${data.value.bills.length}`);
  if (!response.ok) return;
  const body = await response.json() as Payload;
  data.value = { user: body.user, bills: data.value.bills.concat(body.bills) };
}

const name = computed(() => [data.value.user?.firstname, data.value.user?.lastname].filter(Boolean).join(' '));
const location = computed(() =>
  data.value.user?.state && data.value.user?.district ? `${data.value.user.state}-${data.value.user.district}` : '',
);
const pageTitle = computed(() => name.value ?? 'Profile');
const pageDescription = computed(() =>
  name.value
    ? `View ${name.value}'s votes on federal legislation and provisions. Public record of civic participation.`
    : 'User voting profile',
);

useHead({
  title: pageTitle,
  titleTemplate: '%s - Popular Legislation',
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: computed(() => `${pageTitle.value} - Popular Legislation`) },
    { property: 'og:description', content: pageDescription },
    { property: 'og:type', content: 'profile' },
  ],
});
</script>

<template>
<Shell :mobile-page-title="name || 'Profile'">
  <template #mobilesubtitle>
    <span v-if="location" class="text-sm text-secondary-foreground">{{ location }}</span>
  </template>
  <template #pagetitle>
    <span class="font-semibold text-2xl">{{ name || 'Profile' }}</span>
  </template>
  <template #subtitle>
    <span v-if="location" class="text-sm text-secondary-foreground">{{ location }}</span>
  </template>
  <template #main>
    <div class="lg:hidden">
      <BillFilters v-model="filters" :mobile="true" />
    </div>
    <div v-if="!isLoading && !data.bills.length" class="mx-auto text-center py-6 space-y-3">
      <Button variant="secondary" size="icon-lg">
        <FolderOpen />
      </Button>
      <div class="text-lg font-semibold">No Bills Found</div>
    </div>
    <div class="flex flex-col divide-y px-4 lg:px-0">
      <div v-for="votedBill of data.bills" :key="votedBill.packageid">
        <div class="flex gap-3">
          <div class="py-6">
            <Button
              :variant="votedBill.vote === Vote.AYE ? 'success' : votedBill.vote === Vote.NAY ? 'destructive' : 'outline'"
              size="icon" class="rounded-full pointer-events-none">
              <Check v-if="votedBill.vote === Vote.AYE" />
              <Ban v-else-if="votedBill.vote === Vote.NAY" />
              <Minus v-else />
            </Button>
          </div>
          <div class="grow">
            <BillCard :bill="votedBill" />
          </div>
        </div>
        <div v-if="votedBill.subprovisionVotes.length" class="ml-4.5 border-l pl-3 mb-6 space-y-1">
          <div v-for="subpvote of votedBill.subprovisionVotes" :key="subpvote.location" class="flex items-start">
            <Button :variant="subpvote.voteOption === Vote.AYE ? 'ghostSuccess' : 'ghostDestructive'" size="icon-sm"
              class="rounded-full pointer-events-none">
              <Check v-if="subpvote.voteOption === Vote.AYE" />
              <Ban v-else-if="subpvote.voteOption === Vote.NAY" />
            </Button>
            <RouterLink :to="`/bill/${votedBill.packageid.split('-')[1]}/${subpvote.location}`">
              <Button variant="link" class="text-xs font-bold h-8">
                {{ pTagBreadcrumbs(subpvote.provision?.provisionTag ?? '') }}
              </Button>
            </RouterLink>
            <span v-if="subpvote.provision?.header" class="font-serif mt-1 pt-px" v-html="subpvote.provision.header" />
          </div>
        </div>
      </div>
    </div>
    <Loader v-if="isLoading" class="py-6 mx-auto" />
    <Button v-if="hasMore" variant="secondary" class="w-full mx-4" @click="loadMore">Load More</Button>
  </template>
  <template #sidebar>
    <div class="flex flex-col divide-y-2">
      <div class="text-gray-700 dark:text-zinc-300 py-3 px-2">
        <div class="flex gap-2 items-center mb-2">
          <Funnel :size="20" />
          <span class="text-base">Filter</span>
        </div>
        <BillFilters v-model="filters" />
      </div>
    </div>
  </template>
</Shell>
</template>