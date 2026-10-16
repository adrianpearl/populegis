<!-- src/views/Bill.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Document from '@/views/Document.vue';
import Toc from '@/components/Toc.vue';
import SearchBill from '@/components/SearchBill.vue';
import BillCardHeader from '@/components/BillCardHeader.vue';
import BillActions from '@/components/BillActions.vue';
import { JsonViewer } from '@/components/ui/json-viewer';
import { List, FileSearch, Route, ListTree } from '@lucide/vue';
import { useLastAppearedStore } from '../stores/lastAppeared.ts';
import { useLastVoteStore, Vote } from '../stores/lastVote.ts';
import { toast } from 'vue-sonner';
import { useHead } from '@unhead/vue';
import { useApi } from '@/composables/useApi';
import type { InferSelectModel } from 'drizzle-orm';
import type { bills, provisions as provisionsTable } from '@populegis/db';

const props = defineProps({
  packageid: { type: String, required: false },
  titleSlug: { type: String, required: false },
  location: { type: Number, required: false },
})

type BillRow = InferSelectModel<typeof bills> & { status: CongressBillStatus, provisionCount: number };
type ProvisionRow = InferSelectModel<typeof provisionsTable>;
type BillPayload = { bill: BillRow; provisions: ProvisionRow[] };

type BillAction = {
  text: string;
  type: string;
  actionCode?: string;
  actionDate: string;
  actionTime?: string;
  sourceSystem?: { code?: string; name: string };
  committees?: { name: string; systemCode: string }[];
  recordedVotes?: {
    recordedVote: {
      url: string;
      date: string;
      chamber: string;
      congress: string;
      rollNumber: string;
      sessionNumber: string;
    };
  };
};

type CongressBillStatus = {
  type?: string;
  title?: string;
  number?: string;
  congress?: string;
  originChamber?: string;
  introducedDate?: string;
  updateDate?: string;
  actions?: BillAction[];
  latestAction?: { text: string; actionDate: string };
  policyArea?: { name: string };
  sponsors?: { fullName: string; party?: string; state?: string; bioguideId?: string }[];
  committees?: { name: string; systemCode: string; chamber?: string }[];
};

function asBillStatus(status: unknown): CongressBillStatus {
  return (status ?? {}) as CongressBillStatus;
}

const { data, isLoading: loading, run } = useApi<BillPayload | null>(null);
const lastResult = ref<BillPayload>();

const lastAppearedStore = useLastAppearedStore();
const lastVoteStore = useLastVoteStore();

const limit = ref(250);
const backset = ref(100);
const offset = computed(() => props.location ? Math.max(props.location - backset.value, 0) : 0);
const queryEnabled = ref(true);

// Define Bill-specific navigation configuration
const billNavItems = [
  { name: 'Table of Contents', icon: List },
  { name: 'Search Bill', icon: FileSearch },
  { name: 'Bill Actions', icon: Route },
  { name: 'Bill Status', icon: ListTree }
];

watch(() => props.location, (newLocation) => {
  const newLoc = newLocation ?? 0;
  const loaded = lastResult.value?.provisions.map(d => d.location) ?? [];
  if (loaded.includes(newLoc)) {
    queryEnabled.value = false;
  } else {
    limit.value = 250;
    queryEnabled.value = true;
  }
});

watch([() => props.packageid, () => props.titleSlug, offset, limit, queryEnabled], () => {
  if (!queryEnabled.value) return
  const params = new URLSearchParams({
    offset: String(offset.value),
    limit: String(limit.value),
  })
  if (props.packageid) params.set('packageid', props.packageid)
  else if (props.titleSlug) params.set('slug', props.titleSlug)
  else return

  run(`/api/bill?${params}`)
}, { immediate: true });

watch(data, (next) => {
  if (!next) return;
  lastResult.value = next;
  lastAppearedStore.setTime(new Date().getTime());
});

const provisions = computed(() => lastResult.value?.provisions);
const form = computed(() => lastResult.value?.bill.form);
const bill = computed(() => lastResult.value?.bill);
const billStatus = computed(() => asBillStatus(bill.value?.status));
const billId = computed(() => [bill.value?.billType, bill.value?.number].filter(Boolean).join(' '));
const billPackageId = computed(() => bill.value?.packageid);

const currentVote = ref<Vote>(Vote.NULL);
const onVote = (vote: Vote) => {
  if (billPackageId.value) {
    currentVote.value = vote;
    lastVoteStore.setState(billPackageId.value, 0, vote);
    toast.info('Your interest in popular government is appreciated.', {
      description: 'Please check back soon for further updates.',
      closeButton: true,
    });
  }
};

// Meta tags and title
const pageTitle = computed(() => {
  if (!bill.value) return 'Bill';
  const id = billId.value;
  const title = bill.value.shortTitle;
  return title ? `${id} | ${title}` : id;
});

const pageDescription = computed(() => {
  if (!bill.value?.officialTitle) return 'View full text of federal legislation';
  const title = bill.value.officialTitle;
  return title.length > 155 ? title.substring(0, 152) + '...' : title;
});

useHead({
  title: pageTitle,
  titleTemplate: '%s - Popular Legislation',
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:type', content: 'article' }
  ]
});
</script>

<template>
<Document v-if="billPackageId" :document-id="billPackageId" :mobile-page-title="bill ? billId : 'Bill'"
  :provisions="provisions ?? []" :provision-count="bill?.provisionCount ?? 0" :location="location" :loading="loading"
  :current-vote="currentVote" :nav-items="billNavItems" @load-more="limit += 100" @load-previous="backset += 50"
  @vote="onVote">
  <!-- Slot mapping for Shell's navbar title alignment -->
  <template #pagetitle>
    <div class="max-w-full flex justify-between gap-1">
      <div class="flex gap-2 items-baseline min-w-0 shrink">
        <span class="font-semibold text-base whitespace-nowrap">{{ billId }}</span>
        <span v-if="bill?.shortTitle" class="text-base">|</span>
        <span v-if="bill?.shortTitle"
          class="font-normal text-base font-serif whitespace-nowrap text-ellipsis overflow-hidden">
          {{ bill?.shortTitle }}
        </span>
      </div>
    </div>
  </template>

  <!-- Inner content slot components mapping -->
  <template #header>
    <div v-if="bill" class="relative mb-16 px-6 pt-20 space-y-2">
      <div class="font-serif text-3xl lg:text-5xl">{{ bill.shortTitle }}</div>
      <BillCardHeader header-type="sub" :bill="bill" />
    </div>
  </template>

  <template #form>
    <div v-if="form" class="legis px-8" v-html="form" />
  </template>

  <!-- Conditional rendering structural sub-views wrapper inside Document layout panels -->
  <template #navigationContent="{ activeItem, isMobile }">
    <Toc v-if="activeItem === 'Table of Contents'" :packageid="billPackageId" />
    <SearchBill v-else-if="activeItem === 'Search Bill'" :packageid="billPackageId" :mobile="isMobile" />
    <JsonViewer v-else-if="activeItem === 'Bill Status'" :data="billStatus" root-name="status" />
    <BillActions v-else-if="activeItem === 'Bill Actions' && billStatus.actions" :actions="billStatus.actions" />
  </template>
</Document>
</template>

<style>
.legis {
  font-family: 'cheltenhamclassic', serif;
}

metadata {
  display: none;
}

form>distribution-code {
  display: none;
}

form>calendar {
  display: block;
  text-align: right;
}

form>congress,
form>session {
  display: block;
  top: 1em;
  text-align: center;
  width: fit-content;
  font-variant-caps: small-caps;
}

form>legis-num,
form>legis-type {
  display: block;
  text-align: center;
  font-size: xx-large;
  font-weight: bold;
  line-height: 1em;
  margin-bottom: 0.5em;
}

form>associated-doc {
  display: block;
  text-align: center;
  font-weight: bold;
  font-size: large;
}

form hr {
  margin: 1em auto;
  width: 40%;
}

form>current-chamber {
  display: block;
  text-align: center;
  font-size: large;
}

form>current-chamber::before {
  content: '';
  display: block;
  border-top: 1px solid inherit;
}

form>action {
  display: block;
  margin-top: 1em;
}

form>action>action-date {
  display: block;
  text-align: center;
  font-variant-caps: small-caps;
}

form>action>action-desc {
  display: block;
  text-indent: 1em;
}

action sponsor,
action cosponsor {
  font-variant-caps: small-caps;
}
</style>
