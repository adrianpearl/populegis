<script setup lang="ts">
import { type PropType, computed } from 'vue';
import billVersions from '../utils/billVersions.json';
import Tooltip from './Tooltip.vue';
import { type Bill } from '@/views/HomeView.vue';
import { Badge } from './ui/badge';
import { ArrowRightLeft, BadgeCheck, Gavel, ClipboardList, Inbox, GitCompare, PenTool } from '@lucide/vue';

const VERSION_ICON = {
  introduced: Inbox,
  reported: ClipboardList,
  passedOne: Gavel,
  otherChamber: ArrowRightLeft,
  resolving: GitCompare,
  enrolled: PenTool,
  law: BadgeCheck,
} as const;

function versionGroup(packageid: string) {
  if (packageid.startsWith('PLAW-')) return 'law';
  const suffix = packageid.match(/[a-z]+$/)?.[0] ?? '';
  if (suffix === 'ih' || suffix === 'is') return 'introduced';
  if (suffix === 'rh' || suffix === 'rs') return 'reported';
  if (suffix === 'eh' || suffix === 'es') return 'passedOne';
  if (suffix === 'rfh' || suffix === 'rfs' || suffix === 'pcs') return 'otherChamber';
  if (suffix === 'eah' || suffix === 'eas') return 'resolving';
  if (suffix === 'enr') return 'enrolled';
  return 'introduced';
}

type BillHeaderType = 'main' | 'sub';

/** Sponsor payload stored in bills.sponsor (jsonb). */
export type BillSponsor = {
  fullName?: string | null;
  [key: string]: unknown;
};

const { bill, headerType } = defineProps({
  bill: {
    type: Object as PropType<Bill>,
    required: true
  },
  headerType: {
    type: String as PropType<BillHeaderType>,
    required: true
  }
});

const currentCongress = 119;
const billVersionInfo = computed(() =>
  billVersions.find(d => d.versionAbbreviation === `${bill.version ?? ''}`.toUpperCase())
);
</script>

<template>
<div v-if="bill">
  <div v-if="headerType === 'main'" class="flex gap-1 items-center">
    <span class="font-bold uppercase">{{ bill.billType }}.</span>
    <span class="font-bold">{{ bill.number }}</span>
    <Tooltip content="This bill is from a previous congress.">
      <Badge variant="secondary" class="ml-1" v-if="bill.congress != currentCongress && bill.congress > 0">
        {{ bill.congress }}
      </Badge>
    </Tooltip>
  </div>
  <div v-else-if="headerType === 'sub'" class="text-secondary-foreground dark:text-muted-foreground">
    <div class="flex gap-2 items-center flex-wrap">
      <span v-if="billVersionInfo?.version" class="flex gap-2 items-center text-primary">
        <component :is="VERSION_ICON[versionGroup(bill.packageid)]" class="size-4 text-xs" />
        {{ billVersionInfo.version }}
      </span>
      <span>{{ new Date(bill.dateIssued).toDateString() }}</span>
      <!-- <Badge variant="destructive" v-if="billError" v-tooltip="'No provisions found for this bill.'">
          Error
        </Badge> -->
    </div>
  </div>
</div>
</template>