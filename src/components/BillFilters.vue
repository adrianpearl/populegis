<script setup lang="ts">
import { computed, ref } from 'vue';
import { watchDebounced } from '@vueuse/core';
import { ListFilter, X } from '@lucide/vue';
import SearchSelect from './SearchSelect.vue';
import CheckboxGroup from './CheckboxGroup.vue';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from './ui/input/index.ts';
import houseMembers from '../utils/houseMembers.json';
import senateMembers from '../utils/senateMembers.json';
import legislativeSubjects from '../utils/legislativeSubjects.json';
import policyAreas from '../utils/policyAreas.json';
import type { BillSearch } from '../../shared/bills';

defineProps({ mobile: Boolean });

const search = defineModel<Partial<BillSearch>>({ required: true });
const currentFilter = ref<string>();
const titleQuery = ref(search.value.title ?? '');

watchDebounced(titleQuery, (title: string) => {
  search.value = { ...search.value, title: title || undefined };
}, { debounce: 500, maxWait: 1000 });

const billTypeGroups: Record<string, string[]> = {
  'Bills (H.R. or S.)': ['HR', 'S'],
  'Resolutions (H.Res. or S.Res.)': ['HRES', 'SRES'],
  'Joint Resolutions (H.J.Res. or S.J.Res.)': ['HJRES', 'SJRES'],
  'Concurrent Resolutions (H.Con.Res. or S.Con.Res.)': ['HCONRES', 'SCONRES'],
};
const versionGroups: Record<string, string[]> = {
  Introduced: ['ih', 'is'],
  'Committee Consideration': ['rth', 'rts', 'pcs', 'pch'],
  'Floor Consideration': ['rh', 'rs'],
  'Passed One Chamber': ['eh', 'es', 'rdh', 'rds'],
  'Passed Both Chambers': ['enr'],
};
const congresses = [119, 118, 117, 116, 115, 114, 113, 112, 111, 110];
const members = houseMembers.concat(senateMembers);

function selectedGroups(values: string[], groups: Record<string, string[]>) {
  return Object.keys(groups).filter((name) => (groups[name] ?? []).every((value) => values.includes(value)));
}

const selectedTypeGroups = computed({
  get: () => selectedGroups(search.value.billTypes ?? [], billTypeGroups),
  set: (names: string[]) => {
    search.value = { ...search.value, billTypes: names.flatMap((name) => billTypeGroups[name] ?? []) };
  },
});
const selectedVersionGroups = computed({
  get: () => selectedGroups(search.value.versions ?? [], versionGroups),
  set: (names: string[]) => {
    search.value = { ...search.value, versions: names.flatMap((name) => versionGroups[name] ?? []) };
  },
});

const filters = [
  { name: 'Congress', value: () => search.value.congress, clear: () => ({ congress: [] }) },
  { name: 'Chamber of Origin', value: () => search.value.originChamber, clear: () => ({ originChamber: undefined }) },
  { name: 'Bill Type', value: () => selectedTypeGroups.value, clear: () => ({ billTypes: [] }) },
  { name: 'Number', value: () => search.value.number, clear: () => ({ number: undefined }) },
  { name: 'Title', value: () => search.value.title, clear: () => ({ title: undefined }) },
  { name: 'Version', value: () => selectedVersionGroups.value, clear: () => ({ versions: [] }) },
  { name: 'Sponsor', value: () => search.value.sponsorName, clear: () => ({ sponsorName: undefined }) },
  { name: 'Appropriations', value: () => search.value.appropriationsOnly, clear: () => ({ appropriationsOnly: false }) },
  { name: 'Policy Area', value: () => search.value.policyArea, clear: () => ({ policyArea: undefined }) },
  { name: 'Legislative Subjects', value: () => search.value.legislativeSubject, clear: () => ({ legislativeSubject: undefined }) },
];

function isSet(value: unknown) {
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}
function display(value: unknown) {
  if (Array.isArray(value)) return value.length > 1 ? `${value.length} items` : value[0];
  return value;
}
function clear(patch: Partial<BillSearch>) {
  if ('title' in patch) titleQuery.value = '';
  search.value = { ...search.value, ...patch };
}
function set<K extends keyof BillSearch>(key: K, value: BillSearch[K]) {
  search.value = { ...search.value, [key]: value };
}
</script>

<template>
<div :class="mobile ? '' : 'flex flex-col gap-2 dark:text-zinc-300'">
  <div class="flex gap-2 items-center" :class="mobile
    ? 'overflow-x-auto py-2 px-5 dark:border-zinc-800 text-gray-700'
    : 'flex-wrap py-2'">
    <span v-if="mobile" class="text-primary">
      <ListFilter :size="16" />
    </span>
    <button v-for="filter of filters" :key="filter.name"
      @click="currentFilter = currentFilter === filter.name ? undefined : filter.name"
      class="flex text-nowrap items-center gap-2 rounded-sm"
      :class="mobile
        ? 'text-sm px-2 py-1 bg-muted text-accent-foreground'
        : 'text-xs px-2.5 py-1.5 bg-zinc-900/5 hover:bg-zinc-900/10 dark:text-zinc-300 dark:bg-zinc-100/10 dark:hover:bg-gray-100/15'">
      <span :class="currentFilter === filter.name && mobile ? 'font-semibold' : ''">{{ filter.name }}</span>
      <span v-if="isSet(filter.value())" class="font-semibold" :class="mobile ? 'text-xs' : ''">
        {{ display(filter.value()) }}
      </span>
      <span v-if="isSet(filter.value())" @click.stop="clear(filter.clear())"
        :class="mobile ? '' : 'px-0.5 rounded-full hover:bg-primary/10'">
        <X :size="16" />
      </span>
    </button>
  </div>

  <hr v-if="!mobile" />
  <div v-if="currentFilter" :class="mobile ? 'bg-muted/50 border-y dark:border-zinc-800' : ''">
    <div class="flex flex-col gap-3 text-sm" :class="mobile ? 'px-6 py-4' : ''">
      <div>{{ currentFilter }}</div>

      <select v-if="currentFilter === 'Congress'" multiple class="w-full rounded-sm px-2"
        :class="mobile ? 'border' : 'bg-zinc-50 dark:bg-zinc-700'" :value="search.congress"
        @change="set('congress', Array.from(($event.target as HTMLSelectElement).selectedOptions).map((o) => Number(o.value)))">
        <option v-for="congress of congresses" :key="congress" :value="congress">{{ congress }}</option>
      </select>

      <div v-else-if="currentFilter === 'Chamber of Origin'" class="flex flex-col gap-2">
        <label v-for="chamber of ['House', 'Senate']" :key="chamber" class="flex gap-2 items-center"
          :class="mobile ? '' : 'text-xs'">
          <input type="radio" class="accent-blue-600" name="chamber" :value="chamber.toUpperCase()"
            :checked="search.originChamber === chamber.toUpperCase()"
            @change="set('originChamber', chamber.toUpperCase())" />
          {{ chamber }}
        </label>
      </div>

      <CheckboxGroup v-else-if="currentFilter === 'Bill Type'" :options="Object.keys(billTypeGroups)"
        v-model="selectedTypeGroups" />
      <Input v-else-if="currentFilter === 'Number'" type="number" placeholder="Enter bill number"
        :model-value="search.number" @update:model-value="set('number', $event ? Number($event) : undefined)" />
      <CheckboxGroup v-else-if="currentFilter === 'Version'" :options="Object.keys(versionGroups)"
        v-model="selectedVersionGroups" />

      <div v-else-if="currentFilter === 'Sponsor'" :class="mobile ? '' : 'pb-10'">
        <SearchSelect :model-value="search.sponsorName ?? ''"
          @update:model-value="set('sponsorName', $event || undefined)" :options="members"
          placeholder="Enter a member of congress" :mobile="mobile" />
      </div>

      <label v-else-if="currentFilter === 'Appropriations'"
        class="flex items-center space-x-3 text-sm text-gray-700 dark:text-zinc-400">
        <Switch :model-value="search.appropriationsOnly" @update:model-value="set('appropriationsOnly', $event)" />
        Appropriations bills only
      </label>

      <SearchSelect v-else-if="currentFilter === 'Policy Area'" :model-value="search.policyArea ?? ''"
        @update:model-value="set('policyArea', $event || undefined)" :options="policyAreas"
        placeholder="Enter a policy area" :mobile="mobile" />
      <SearchSelect v-else-if="currentFilter === 'Legislative Subjects'" :model-value="search.legislativeSubject ?? ''"
        @update:model-value="set('legislativeSubject', $event || undefined)" :options="legislativeSubjects"
        placeholder="Enter a legislative subject" :mobile="mobile" />

      <div v-else-if="currentFilter === 'Title'" class="flex flex-col gap-4">
        <Input v-model="titleQuery" placeholder="Enter bill title (in whole or in part)" />
        <label class="flex items-center space-x-3 text-sm text-gray-700 dark:text-zinc-400">
          <Switch :model-value="search.includeOfficialTitle"
            @update:model-value="set('includeOfficialTitle', $event)" />
          Include official title
        </label>
      </div>

      <div v-if="mobile" class="flex justify-end">
        <Button variant="outline" class="shadow-none bg-transparent" @click="currentFilter = undefined">Done</Button>
      </div>
    </div>
  </div>
</div>
</template>