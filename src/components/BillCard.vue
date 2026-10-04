<script setup lang="ts">
import { type PropType, computed } from 'vue';
import BillCardHeader from './BillCardHeader.vue';
import { getBillBasePath } from '@/utils/billPath.ts';
import { type Bill } from '@/views/HomeView.vue';

/** Same row the header renders, plus the fields this card links and titles with. */
export type CardBill = Bill & {
  packageid: string;
  shortTitle: string | null;
};

const { bill, context } = defineProps({
  bill: {
    type: Object as PropType<CardBill>,
    required: true
  },
  context: {
    type: String
  }
});

const titlePrepend = computed(() => {
  const firstWord = (bill.shortTitle ?? bill.officialTitle)?.split(' ')[0];
  if (bill.billType.toLowerCase().includes('res') && firstWord?.endsWith('ing')) {
    return 'RESOLUTION ';
  }
  return '';
});

const billPath = computed(() => getBillBasePath(bill.packageid));
</script>

<template>
  <RouterLink v-if="bill" :to="billPath">
    <div class="group" :class="context === 'search' ? 'p-3' : 'py-6 px-1'">
      <BillCardHeader :header-type="'main'" :bill="bill" class="text-xs" />
      <div class="font-serif" :class="context === 'search' ? 'text-base' : 'text-2xl'">
        {{ titlePrepend + (bill.shortTitle ?? bill.officialTitle) }}
      </div>
      <BillCardHeader :header-type="'sub'" :bill="bill" class="text-xs" />
    </div>
  </RouterLink>
</template>