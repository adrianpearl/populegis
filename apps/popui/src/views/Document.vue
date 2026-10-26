<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import Provision from '@/components/Provision.vue';
import ProvisionChip from '@/components/ProvisionChip.vue';
import Loader from '@/components/Loader.vue';
import Shell from '@/views/Shell.vue';
import Tooltip from '@/components/Tooltip.vue';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Check, Ban, X } from '@lucide/vue';
import { Vote } from '@/stores/lastVote';
import type { Component } from 'vue';
import { provisionsDBtoDisplayChunk } from '@/utils';
import type { InferSelectModel } from 'drizzle-orm';
import type { provisions as provisionsTable } from '@populegis/db';

type ProvisionRow = InferSelectModel<typeof provisionsTable>;

interface NavItem {
  name: string;
  icon: Component;
}

const props = defineProps<{
  mobilePageTitle: string;
  provisions: ProvisionRow[];
  provisionCount: number;
  location?: number;
  loading: boolean;
  currentVote: Vote;
  navItems: NavItem[]; // Pass permitted options from the parent page
}>();

const emit = defineEmits<{
  loadMore: [];
  loadPrevious: [];
  vote: [Vote];
}>();

const currentItem = ref("");
const currentMobileItem = ref("");
const titleVisible = ref(true);
let titleEndScroll = Infinity;

function handleScroll() {
  if (titleEndScroll === Infinity) {
    const el = document.getElementById('doc-title-end');
    if (el) titleEndScroll = window.scrollY + el.getBoundingClientRect().bottom - 56;
  }
  titleVisible.value = window.scrollY < titleEndScroll;
}
onMounted(() => document.addEventListener('scroll', handleScroll, { passive: true }));
onUnmounted(() => document.removeEventListener('scroll', handleScroll));

const maxLocation = computed(() => Math.max(props.provisionCount - 1, 0));
const minLoaded = computed(() => Math.min(...props.provisions.map((d) => d.location), Infinity));
const maxLoaded = computed(() => Math.max(...props.provisions.map((d) => d.location), -1));

function toDisplay(rows: ProvisionRow[]) {
  const locations = rows.map((d) => d.location);
  const roots = rows.filter((d) => d.parentLocation == d.location || !locations.includes(d.parentLocation ?? -1));
  const rootIdxs = roots.map((d) => rows.indexOf(d));
  return rootIdxs.map((d, i) => provisionsDBtoDisplayChunk(rows.slice(d, rootIdxs[i + 1]), rows[d]?.level ?? 1));
}
const tree = computed(() => toDisplay(props.provisions));

watch(() => props.location, (newLoc, oldLoc) => {
  if (newLoc === oldLoc) return;
  currentMobileItem.value = "";
})

const NULL = Vote.NULL;
const AYE = Vote.AYE;
const NAY = Vote.NAY;
</script>

<template>
<Shell :mobile-page-title="mobilePageTitle" :logo="true" :showMobileMainOverlay="currentMobileItem != ''"
  :page-loading="loading">
  <!-- Forward Page Title slot up to Shell -->
  <template #pagetitle>
    <slot name="pagetitle" />
  </template>

  <!-- Content Engine -->
  <template #main>
    <Loader v-if="loading && provisions.length == 0" />
    <div v-else :class="{ 'opacity-70 animate-pulse': loading }">
      <slot name="header" />
      <div id="doc-title-end" class="my-16 w-1/2 mx-auto">
        <hr />
      </div>
      <ProvisionChip :visible="!titleVisible" />
      <slot name="form" />
      <Button v-if="minLoaded > 1" variant="secondary" class="w-5/6 mx-auto my-3" @click="emit('loadPrevious')">
        Load More
      </Button>
      <div class="legis lg:ml-0 px-8 pb-32">
        <div class="lg:hidden ml-4">
          <Provision v-for="provision of tree" :key="provision.location" :provision="provision" :isMobile="true"
            :currentLocation="location" />
        </div>
        <div class="hidden lg:block">
          <Provision v-for="provision of tree" :key="provision.location" :provision="provision" :isMobile="false"
            :currentLocation="location" />
        </div>
      </div>
      <Button v-if="maxLoaded < maxLocation" variant="secondary" class="w-5/6 mx-auto" @click="emit('loadMore')">
        Load More
      </Button>
    </div>
  </template>

  <!-- Shared Dynamic Overlay View -->
  <template #mainOverlay>
    <Transition>
      <div class="relative h-full p-3 overflow-y-scroll">
        <div class="w-full flex justify-between items-center mb-px">
          <div class="text-lg font-semibold">{{ currentMobileItem }}</div>
          <Button variant="ghost" size="icon-lg" @click="() => currentMobileItem = ''">
            <X />
          </Button>
        </div>
        <!-- Let parent specify the inner panel UI using a scoped slot -->
        <slot name="navigationContent" :active-item="currentMobileItem" :is-mobile="true" />
      </div>
    </Transition>
  </template>

  <!-- Shared Dynamic Sidebar View -->
  <template #sidebar>
    <div class="flex flex-col mb-2 z-30">
      <div class="sticky top-0 z-10 bg-background pb-2 flex items-center flex-wrap-reverse gap-2 justify-between">
        <div class="font-semibold w-full xl:w-fit">{{ currentItem }}</div>
        <div class="flex flex-wrap items-stretch gap-0.5">
          <ToggleGroup class="flex gap-0.5" v-model="currentItem">
            <Tooltip v-for="item of navItems" :key="item.name" :content="item.name">
              <ToggleGroupItem class="size-9 rounded-md" :value="item.name" :aria-label="'Toggle ' + item.name">
                <component :is="item.icon"></component>
              </ToggleGroupItem>
            </Tooltip>
          </ToggleGroup>
          <div class="w-px bg-border mx-1"></div>
          <Button size="icon" :variant="currentVote === Vote.AYE ? 'success' : 'ghostSuccess'"
            @click="() => emit('vote', currentVote === AYE ? NULL : AYE)">
            <Check />
          </Button>
          <Button size="icon" :variant="currentVote === Vote.NAY ? 'destructive' : 'ghostDestructive'"
            @click="() => emit('vote', currentVote === NAY ? NULL : NAY)">
            <Ban />
          </Button>
        </div>
      </div>
      <div class="grow">
        <slot name="navigationContent" :active-item="currentItem" :is-mobile="false" />
      </div>
    </div>
  </template>

  <!-- Shared Dynamic Mobile Bottom Menu -->
  <template #mobileNav>
    <div class="w-full h-14 bg-background border-t dark:border-zinc-900 flex justify-around items-center">
      <Button size="icon-lg" variant="ghost" v-for="item of navItems" :key="item.name"
        @click="() => currentMobileItem = currentMobileItem == item.name ? '' : item.name"
        :class="{ 'bg-muted': currentMobileItem == item.name }">
        <component :is="item.icon"></component>
      </Button>
      <Button size="icon-lg" :variant="currentVote === Vote.AYE ? 'success' : 'ghostSuccess'"
        @click="() => emit('vote', currentVote === AYE ? NULL : AYE)">
        <Check />
      </Button>
      <Button size="icon-lg" :variant="currentVote === Vote.NAY ? 'destructive' : 'ghostDestructive'"
        @click="() => emit('vote', currentVote === NAY ? NULL : NAY)">
        <Ban />
      </Button>
    </div>
  </template>
</Shell>
</template>