<script setup lang="ts">
import { computed, ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, MessageSquare, Gavel, Users, FilePlus, PenTool, FileText 
} from '@lucide/vue';

const props = defineProps<{
  actions: any[]
}>();

const ACTION_CATEGORIES: Record<string, { label: string; icon: any }> = {
  FloorVotes: { label: 'Votes', icon: CheckSquare },
  FloorDebate: { label: 'Debate', icon: MessageSquare },
  FloorMotions: { label: 'Motions', icon: Gavel },
  Committee: { label: 'Committee', icon: Users },
  IntroReferral: { label: 'Introduction', icon: FilePlus },
  Presidential: { label: 'Presidential / Law', icon: PenTool },
  Other: { label: 'Other', icon: FileText },
};

const VOTE_ACTION_CODES = new Set([
  'H37100', 'H37300', 'H37210', 'H37220', // passage and suspension votes
  'H36210',                                 // recommit votes
  '8000', '9000', '17000',                  // LoC passage/failure summaries
]);

const DEBATE_ACTION_CODES = new Set(['H8D000']);
const PRESIDENTIAL_ACTION_CODES = new Set(['E20000', 'E30000', 'E40000']);

const VOTE_TEXT_RE = /Yea-Nay Vote|Yeas and Nays|voice vote|Roll no\.|Record Vote Number/i;
const DEBATE_TEXT_RE = /^DEBATE\b|^POSTPONED PROCEEDINGS/i;
const PRESIDENTIAL_TEXT_RE = /^Presented to President|^Signed by President/i;

function getCategory(action: { type: string; actionCode?: string; text?: string; recordedVotes?: any }): string {
  if (['President', 'BecameLaw'].includes(action.type)) return 'Presidential';
  if (action.type === 'Committee') return 'Committee';
  if (action.type === 'IntroReferral') return 'IntroReferral';

  if (action.type === 'Floor' || action.type === 'ResolvingDifferences') {
    const code = action.actionCode ?? '';
    const text = action.text ?? '';

    if (PRESIDENTIAL_ACTION_CODES.has(code) || PRESIDENTIAL_TEXT_RE.test(text)) return 'Presidential';
    if (VOTE_ACTION_CODES.has(code) || action.recordedVotes || (!code && VOTE_TEXT_RE.test(text))) return 'FloorVotes';
    if (DEBATE_ACTION_CODES.has(code) || (!code && DEBATE_TEXT_RE.test(text))) return 'FloorDebate';
    return 'FloorMotions';
  }

  return 'Other';
}

function getVoteUrl(action: any): string | null {
  const vote = action.recordedVotes?.recordedVote;
  if (!vote) return null;
  if (vote.chamber === 'House') {
    const year = new Date(vote.date).getFullYear();
    return `https://clerk.house.gov/Votes/${year}${vote.rollNumber}`;
  }
  if (vote.chamber === 'Senate') {
    const session = `${vote.congress}${vote.sessionNumber}`;
    const roll = vote.rollNumber.padStart(5, '0');
    return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${session}/vote_${vote.congress}_${vote.sessionNumber}_${roll}.htm`;
  }
  return vote.url ?? null;
}

const dedupedActions = computed(() =>
  props.actions.filter((d: any, i: number) => i === 0 || d.text !== props.actions[i - 1].text)
);

const presentCategories = computed(() => {
  const cats = new Set(dedupedActions.value.map((a: any) => getCategory(a)));
  return Object.keys(ACTION_CATEGORIES).filter(k => cats.has(k));
});

const activeFilters = ref<Set<string>>(new Set());

const toggleFilter = (category: string) => {
  const next = new Set(activeFilters.value);
  if (next.has(category)) {
    next.delete(category);
  } else {
    next.add(category);
  }
  activeFilters.value = next;
};

const filteredActions = computed(() => {
  if (activeFilters.value.size === 0) return dedupedActions.value;
  return dedupedActions.value.filter((a: any) => activeFilters.value.has(getCategory(a)));
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="presentCategories.length > 1" class="flex flex-wrap gap-1.5">
      <button
        v-for="cat of presentCategories"
        :key="cat"
        @click="toggleFilter(cat)"
        class="transition-opacity flex items-center gap-1"
        :class="{ 
          'opacity-40': activeFilters.size > 0 && !activeFilters.has(cat),
          'border-blue-500': activeFilters.has(cat)
        }"
      >
        <Badge variant="outline" class="cursor-pointer select-none">
          <component :is="ACTION_CATEGORIES[cat]?.icon" class="w-4 h-4 mr-1" />
          {{ ACTION_CATEGORIES[cat]?.label }}
        </Badge>
      </button>
    </div>
    <div class="flex flex-col gap-4">
      <div v-for="(action, i) of filteredActions" :key="i">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-500">{{ new Date(action.actionDate + 'T00:00:00').toDateString() }}</span>
          <Badge variant="outline" class="text-[10px] px-1.5 py-0 flex items-center">
            <component :is="ACTION_CATEGORIES[getCategory(action)]?.icon" class="w-3 h-3 mr-1" />
            {{ ACTION_CATEGORIES[getCategory(action)]?.label }}
          </Badge>
        </div>
        <div class="font-serif">{{ action.text }}</div>
        <a
          v-if="getVoteUrl(action)"
          :href="getVoteUrl(action)!"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >View roll call</a>
      </div>
    </div>
  </div>
</template>
