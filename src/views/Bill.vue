<script setup lang="ts">
import Loader from '@/components/Loader.vue';
import Toc from '@/components/Toc.vue';
import SearchBill from '@/components/SearchBill.vue';
import Shell from './Shell.vue';
import { Button } from '@/components/ui/button';
import BillCardHeader from '@/components/BillCardHeader.vue';
import BillActions from '@/components/BillActions.vue';
import { provisionsDBtoDisplayChunk } from '../utils/index.ts';
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useLastAppearedStore } from '../stores/lastAppeared.ts';
import { useLastVoteStore, Vote } from '../stores/lastVote.ts';
import { JsonViewer } from '@/components/ui/json-viewer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { List, FileSearch, Route, ListTree, Check, Ban, X, Vote as VoteIcon } from '@lucide/vue';
import { toast } from 'vue-sonner';
import { useHead } from '@unhead/vue';
import Provision from '@/components/Provision.vue';
import ProvisionChip from '@/components/ProvisionChip.vue';
import { useApi } from '@/composables/useApi';
import type { InferSelectModel } from 'drizzle-orm';
import type { bills, provisions as provisionsTable } from '../db/schema';
import Tooltip from '@/components/Tooltip.vue';

const props = defineProps({
  packageid: {
    type: String,
    required: true
  },
  location: {
    type: Number,
    required: false
  }
});

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
const currentMobileItem = ref("");
const titleVisible = ref(true);
let titleEndScroll = Infinity;

watch(() => props.location, (newLocation) => {
  const newLoc = newLocation ?? 0;
  currentMobileItem.value = '';
  const loaded = lastResult.value?.provisions.map(d => d.location) ?? [];
  if (loaded.includes(newLoc)) {
    queryEnabled.value = false;
  } else {
    limit.value = 250;
    queryEnabled.value = true;
  }
});

watch([() => props.packageid, offset, limit, queryEnabled], () => {
  if (!queryEnabled.value) return;
  const params = new URLSearchParams({
    packageid: props.packageid,
    offset: String(offset.value),
    limit: String(limit.value),
  });
  run(`/api/bill?${params}`);
}, { immediate: true });

watch(data, (next) => {
  if (!next) return;
  lastResult.value = next;
  lastAppearedStore.setTime(new Date().getTime());
});

const maxLocation = computed(() => (lastResult.value?.bill.provisionCount ?? 1) - 1);
const provisions = computed(() => lastResult.value?.provisions);
const form = computed(() => lastResult.value?.bill.form);
const bill = computed(() => lastResult.value?.bill);
const billStatus = computed(() => asBillStatus(bill.value?.status));
const billId = computed(() => [bill.value?.billType, bill.value?.number].filter(Boolean).join(' '));

function handleScroll() {
  if (titleEndScroll === Infinity) {
    const el = document.getElementById('bill-title-end');
    if (el) {
      titleEndScroll = window.scrollY + el.getBoundingClientRect().bottom - 56;
    }
  }
  titleVisible.value = window.scrollY < titleEndScroll;
}

onMounted(() => document.addEventListener('scroll', handleScroll, { passive: true }));
onUnmounted(() => document.removeEventListener('scroll', handleScroll));

const currentVote = ref<Vote>(Vote.NULL);
const onVote = (vote: Vote) => {
  currentVote.value = vote;
  lastVoteStore.setState(props.packageid, 0, vote);
  toast.info('Your interest in popular government is appreciated.', {
    description: 'Please check back soon for further updates.',
    closeButton: true,
  })
}
const NULL = Vote.NULL;
const AYE = Vote.AYE;
const NAY = Vote.NAY;

function provisionsDBtoDisplay(dbProvisionsSorted: ProvisionRow[]) {
  const locations = dbProvisionsSorted.map(d => d.location);
  const roots = dbProvisionsSorted.filter(d => d.parentLocation == d.location || !locations.includes(d.parentLocation ?? -1));
  const rootIdxs = roots.map(d => dbProvisionsSorted.indexOf(d));
  return rootIdxs.map((d, i) => {
    const rootIdxChunk = dbProvisionsSorted.slice(d, rootIdxs[i + 1] ?? undefined)
    return provisionsDBtoDisplayChunk(rootIdxChunk, dbProvisionsSorted[d]?.level ?? 1)
  });
}

const colorCodeToc = ref(false);

const currentItem = ref("");
const icons = [List, FileSearch, Route, ListTree];
const items = ['Table of Contents', 'Search Bill', 'Bill Actions', 'Bill Status'];

const handleLoadMorePrevious = () => {
  // get rid of location param to prevent auto-scroll on re-mount
  // router.replace(route.fullPath.replace(/\/\d+$/g, ''));
  // decrement offset, triggering re-load and re-mount
  backset.value += 50;
}

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
    {
      name: 'description',
      content: pageDescription
    },
    {
      property: 'og:title',
      content: pageTitle
    },
    {
      property: 'og:description',
      content: pageDescription
    },
    {
      property: 'og:type',
      content: 'article'
    }
  ]
});
</script>

<template>
<Shell :mobile-page-title="bill ? billId : 'Bill'" :logo="true" :showMobileMainOverlay="currentMobileItem != ''"
  :page-loading="loading">
  <template v-slot:pagetitle>
    <div class="max-w-full flex justify-between gap-1">
      <div class="flex gap-2 items-baseline min-w-0 shrink">
        <span class="font-semibold text-base whitespace-nowrap">{{ billId }}</span>
        <span v-if="bill?.shortTitle" class="text-base">|</span>
        <span v-if="bill?.shortTitle"
          class="font-normal text-base font-serif whitespace-nowrap text-ellipsis overflow-hidden">{{
            bill?.shortTitle
          }}</span>
      </div>
    </div>
  </template>
  <template v-slot:main>
    <div class="h-full" :class="{ 'opacity-70 animate-pulse': loading }">
      <Loader v-if="loading && !lastResult" />
      <div v-if="lastResult?.bill && (form || provisions)">
        <div class="hidden fixed top-14 w-full border-y dark:border-zinc-900 z-20">
          <div class="flex gap-2 items-stretch min-w-0 h-10 px-4 py-3 bg-background/90">
            <span class="font-semibold text-xs whitespace-nowrap">{{ bill?.billType }} {{ bill?.number }}</span>
            <span v-if="bill?.shortTitle" class="text-xs">|</span>
            <span v-if="bill?.shortTitle"
              class="font-normal font-serif text-sm whitespace-nowrap text-ellipsis overflow-hidden">{{
                bill.shortTitle
              }}</span>
          </div>
        </div>
        <div v-if="bill" class="relative mb-16 lg:mt-0 z-20 lg:z-0 px-6 pt-20 space-y-2 bg-background">
          <BillCardHeader :header-type="'main'" :bill="bill" class="text-sm hidden" />
          <div class="font-serif text-3xl lg:text-5xl">
            {{ bill.shortTitle }}
          </div>
          <BillCardHeader :header-type="'sub'" :bill="bill" />
        </div>
        <div id="bill-title-end" class="my-16 w-1/2 mx-auto">
          <hr />
        </div>
        <ProvisionChip :visible="!titleVisible && currentMobileItem === ''" />
        <div v-if="form" class="legis px-8" :innerHTML="form"></div>
        <div v-if="provisions && Math.min(...provisions.map(d => d.location)) > 1"
          class="w-full flex items-center my-3">
          <Button variant="secondary" class="w-5/6 mx-auto" @click="handleLoadMorePrevious">Load
            More</Button>
        </div>
        <div v-if="provisions" class="legis lg:ml-0 px-8 pb-32">
          <div class="lg:hidden ml-4">
            <Provision v-for="provision of provisionsDBtoDisplay(provisions)" :provision="provision" :isMobile="true"
              :currentLocation="location" />
          </div>
          <div class="hidden lg:block">
            <Provision v-for="provision of provisionsDBtoDisplay(provisions)" :provision="provision" :isMobile="false"
              :currentLocation="location" />
          </div>
        </div>
        <div class="w-full flex items-center">
          <Button variant="secondary" class="w-5/6 mx-auto"
            v-if="provisions && Math.max(...provisions.map(d => d.location)) < maxLocation"
            @click="() => limit += 100">Load More</Button>
        </div>
        <div class="h-16"></div> <!--vertical margin doesn't work here-->
      </div>
    </div>
  </template>
  <template v-slot:mainOverlay>
    <Transition>
      <div class="relative h-full p-3 overflow-y-scroll">
        <div class="w-full flex justify-between items-center mb-px">
          <div class="text-lg font-semibold">{{ currentMobileItem }}</div>
          <Button variant="ghost" size="icon-lg" @click="() => currentMobileItem = ''">
            <component :is="X"></component>
          </Button>
        </div>
        <Toc v-if="currentMobileItem == 'Table of Contents'" :packageid="packageid" />
        <SearchBill v-else-if="currentMobileItem == 'Search Bill'" :packageid="packageid" :mobile="true" />
        <JsonViewer v-else-if="currentMobileItem == 'Bill Status'" :data="billStatus" root-name="status" />
        <BillActions v-else-if="currentMobileItem == 'Bill Actions' && billStatus.actions"
          :actions="billStatus.actions" />
      </div>
    </Transition>
  </template>
  <template v-slot:sidebar>
    <div class="flex flex-col mb-2 z-30">
      <div class="sticky top-0 z-10 bg-background pb-2 flex items-center flex-wrap-reverse gap-2 justify-between">
        <div class="font-semibold w-full xl:w-fit">{{ currentItem }}</div>
        <div class="flex flex-wrap items-stretch gap-0.5">
          <ToggleGroup class="flex gap-0.5" v-model="currentItem">
            <Tooltip v-for="(item, i) of items" :content="item">
              <ToggleGroupItem class="size-9 rounded-md" :value="item" :aria-label="'Toggle ' + item">
                <component :is="icons[i]"></component>
              </ToggleGroupItem>
            </Tooltip>
          </ToggleGroup>
          <div class="w-px bg-border mx-1"></div>
          <Button size="icon" :variant="currentVote === Vote.AYE ? 'success' : 'ghostSuccess'"
            @click="() => onVote(currentVote === AYE ? NULL : AYE)">
            <component :is="Check"></component>
          </Button>
          <Button size="icon" :variant="currentVote === Vote.NAY ? 'destructive' : 'ghostDestructive'"
            @click="() => onVote(currentVote === NAY ? NULL : NAY)">
            <component :is="Ban"></component>
          </Button>
        </div>
      </div>
      <div class="grow">
        <div v-if="currentItem == 'Table of Contents'">
          <div class="hidden flex-not gap-2 text-xs mb-2">
            <input type="checkbox" class="accent-blue-600" v-model="colorCodeToc" />
            <label>Color code items by response</label>
          </div>
          <Toc :packageid="packageid" />
        </div>
        <div v-else-if="currentItem == 'Search Bill'">
          <SearchBill :packageid="packageid" />
        </div>
        <div v-else-if="currentItem == 'Bill Actions'">
          <BillActions v-if="billStatus.actions" :actions="billStatus.actions" />
        </div>
        <div v-else-if="currentItem == 'Bill Status'">
          <JsonViewer :data="billStatus" root-name="status" />
        </div>
      </div>
    </div>
  </template>
  <template v-slot:mobileNav>
    <div class="w-full h-14 bg-background border-t dark:border-zinc-900 flex justify-around items-center">
      <Button size="icon-lg" variant="ghost" v-for="(item, i) of items"
        @click="() => currentMobileItem = currentMobileItem == item ? '' : item"
        :class="{ 'bg-muted': currentMobileItem == item }">
        <component :is="icons[i]"></component>
      </Button>
      <Button size="icon-lg" :variant="currentVote === Vote.AYE ? 'success' : 'ghostSuccess'"
        @click="() => onVote(currentVote === AYE ? NULL : AYE)">
        <Check />
      </Button>
      <Button size="icon-lg" :variant="currentVote === Vote.NAY ? 'destructive' : 'ghostDestructive'"
        @click="() => onVote(currentVote === NAY ? NULL : NAY)">
        <Ban />
      </Button>
    </div>
  </template>
</Shell>
</template>

<style lang="css" scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

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