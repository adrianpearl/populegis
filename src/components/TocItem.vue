<script setup lang="ts">
import { provisionsDBtoDisplayChunk, noHeaderTocDisplay, type DisplayProvision } from '../utils';
import { ref, type PropType, computed, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useLastAppearedStore } from '../stores/lastAppeared';
import { ChevronDown, ChevronRight } from '@lucide/vue';
import { getBillBasePath } from '@/utils/billPath';

const props = defineProps({
  provision: {
    type: Object as PropType<DisplayProvision>,
    required: true
  },
  nextNonDescendant: {
    type: Number,
    required: true
  },
  colorCoded: {
    type: Boolean,
    default: false
  }
});

const noHeaderDisplay = computed(() => noHeaderTocDisplay(props.provision));
function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

const route = useRoute();
const slug = route.params.slug;
const routeLocation = computed(() => +(route.params.location ?? ''));

const basePath = getBillBasePath(props.provision.packageid);
function descendantLocations(provision: DisplayProvision): number[] {
  return provision.children.map(child => [child.location, descendantLocations(child).flat()].flat()).flat();
}

const lastAppearedStore = useLastAppearedStore();

const isAtRoute = ref(routeLocation.value == props.provision.location);
const isAtDescendantRoute = ref(descendantLocations(props.provision).includes(routeLocation.value));
const userExpanded = ref(false);

const fetchedProvision = ref<DisplayProvision>();
const children = computed(() => fetchedProvision.value?.children ?? props.provision.children);
const expandable = computed(() => children.value.some(d => d.header || d.provisionType == 'quoted-block'));
const level = computed(() => props.provision.level as number);
const expanded = computed(() => level.value < 3 || userExpanded.value || isAtRoute.value || isAtDescendantRoute.value || props.provision.provisionType == 'quoted-block');

watch(
  () => route.params.location,
  (newLoc, _oldLoc) => {
    lastAppearedStore.setTime(new Date().getTime())
    if (!newLoc) return;
    isAtRoute.value = +newLoc == props.provision.location;
    isAtDescendantRoute.value = props.provision.location < +newLoc && +newLoc < props.nextNonDescendant
  }
)

watch(
  () => lastAppearedStore.provisionTag,
  (newTag, _oldTag) => {
    if (new Date().getTime() - lastAppearedStore.timestamp < 1000) {
      return;
    }
    isAtRoute.value = newTag == props.provision.provisionTag;
    isAtDescendantRoute.value = newTag.includes(props.provision.provisionTag + '-');
  }
)

let expansionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const EXPANSION_DEBOUNCE_MS = 400;
let requestId = 0;

watch(() => expanded.value, (newVal, oldVal) => {
  if (!(newVal && !oldVal && !fetchedProvision.value)) return;
  if (expansionDebounceTimer) clearTimeout(expansionDebounceTimer);

  expansionDebounceTimer = setTimeout(async () => {
    expansionDebounceTimer = null;
    const tag = props.provision.provisionTag;
    if (!tag) return;

    const id = ++requestId;
    const params = new URLSearchParams({
      packageid: props.provision.packageid,
      tag,
      toc: '1',
      limit: '10000'
    });
    try {
      const response = await fetch(`/api/provisions?${params}`);
      if (!response.ok) return;
      const rows = await response.json();
      if (id !== requestId || !Array.isArray(rows)) return;
      fetchedProvision.value = provisionsDBtoDisplayChunk(rows, 1);
    } catch {
      // Keep the children already on the prop. Same as the old onError, which was unused.
    }
  }, EXPANSION_DEBOUNCE_MS);
});

</script>

<template>
<div class="flex flex-col font-serif">
  <RouterLink :to="`${basePath}/${props.provision.location}`" v-if="props.provision.header || noHeaderDisplay"
    class="flex items-start text-sm cursor-pointer hover:bg-zinc-800/5 dark:hover:bg-zinc-100/10 pt-1 pb-0.5 pr-1.5 rounded-sm"
    :class="isAtRoute || isAtDescendantRoute ? 'text-foreground font-extrabold' : 'text-secondary-foreground'">
    <component :is="expanded ? ChevronDown : ChevronRight" :class="[expandable ? '' : 'invisible']"
      @click.prevent="() => userExpanded = !userExpanded" :size="16"
      class="m-1 mt-0.5 shrink-0 text-muted-foreground hover:text-secondary-foreground" />
    <span v-if="provision.provisionTag?.includes('quoted-block')">&quot;&nbsp;</span>
    <div v-if="noHeaderDisplay && props.provision.provisionType">{{ toTitleCase(props.provision.provisionType) }}&nbsp;
    </div>
    <div v-if="props.provision.enum" :innerHTML="props.provision.enum" />
    <div>
      <span v-if="props.provision.header" class="inline toc-header" :innerHTML="props.provision.header"></span>
      <span v-if="isAtRoute || isAtDescendantRoute" class="ml-1 inline"
        :class="[isAtRoute ? 'text-blue-600' : 'text-slate-400']">
        {{ isAtRoute ? '&#9673;' : '&#9679;' }}
      </span>
    </div>
  </RouterLink>
  <Transition enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 max-h-0 overflow-hidden"
    enter-to-class="opacity-100 max-h-screen" leave-from-class="opacity-100 max-h-screen"
    leave-to-class="opacity-0 max-h-0 overflow-hidden">
    <div v-if="expanded" :class="[level > 2 ? 'pl-4' : '']">
      <TocItem v-for="(child, i) of children" :provision="child"
        :next-non-descendant="children[i + 1]?.location ?? nextNonDescendant" :color-coded="colorCoded" />
    </div>
  </Transition>
</div>
</template>

<style>
header,
enum {
  font-weight: inherit;
}

.toc-header header {
  display: inline;
}
</style>
