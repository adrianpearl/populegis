<script setup lang="ts">
import { useLastAppearedStore } from '../stores/lastAppeared.ts';
import { ref, onMounted, watch, type PropType, computed, onUpdated } from 'vue';
import { centeredHeader, type DisplayProvision, noHeaderTocDisplay, onlyChildrenTypes } from '../utils/index.ts';
import { useIntersectionObserver, useClipboard } from '@vueuse/core'
import { useLastVoteStore, VOTES, type Vote } from '../stores/lastVote.ts';
import { Button } from '@/components/ui/button';
import { MoreVertical, Link, Check, Ban, List } from '@lucide/vue';
import TableProvision from './TableProvision.vue';
import SmsSignupAssistant from './SmsSignupAssistant.vue';
import SmsExampleFlow from './SmsExampleFlow.vue';
import { toast } from "vue-sonner";
import { getBillBasePath } from '@/utils/billPath';

const lastAppearedStore = useLastAppearedStore();
const provisionRef = ref<null | HTMLElement>(null);
const provisionMenu = ref<null | HTMLElement>(null);

const isVisible = ref(false);
const hovered = ref(false);
const { AYE, NAY, NULL } = VOTES;

// Use IntersectionObserver to detect when provision crosses the vertical center
// rootMargin of -50% means trigger when element is at 50% from top (center)
useIntersectionObserver(
  provisionRef,
  ([entry]) => {
    // Fallback to an empty object if entry is undefined
    const { isIntersecting } = entry || {};
    isVisible.value = !!isIntersecting; // Use !! to ensure it evaluates to a strict boolean
  },
  {
    rootMargin: '-50% 0px -50% 0px'
  }
);

const lastVote = useLastVoteStore();

const props = defineProps({
  provision: {
    type: Object as PropType<DisplayProvision>,
    required: true
  },
  parentId: {
    type: String
  },
  ordinal: {
    type: Number
  },
  isMobile: {
    type: Boolean
  },
  currentLocation: {
    type: Number,
    required: false
  }
});

const provisionType = computed(() => props.provision.provisionType ?? '');
const enumText = computed(() => props.provision.enum?.replace(/<[^>]+>/g, '') ?? '');

const ordinalId = provisionType.value == 'whereas' ? props.ordinal : ''
const provisionId = [props.parentId, provisionType.value, enumText.value, ordinalId].filter(d => !!d).join('-');

const hasContent = computed(() => {
  const text = props.provision.text?.replace(/<[^>]+>/g, '').trim() ?? '';
  const header = props.provision.header?.replace(/<[^>]+>/g, '').trim() ?? '';
  return text.length > 0 || header.length > 0 || enumText.value.length > 0;
});

const isOnlyChildren = computed(() => onlyChildrenTypes.includes(provisionType.value) || !hasContent.value);

const source = ref(`${window.location.origin}${getBillBasePath(props.provision.packageid)}/${props.provision.location}`);
const { copy, copied, isSupported: clipboardSupported } = useClipboard({ source, legacy: true })

const alreadyScrolledTo = ref(false);
function scrollTo() {
  lastAppearedStore.setTime(new Date().getTime());
  // Delay scroll to ensure all provisions above have rendered
  // Using setTimeout with a reasonable delay to let the DOM settle
  setTimeout(() => {
    provisionRef.value?.scrollIntoView({ behavior: 'smooth' });
    if (props.provision.header || noHeaderTocDisplay(props.provision)) {
      lastAppearedStore.setState(
        props.provision.provisionTag ?? '',
        props.provision.header?.replace(/<[^>]+>/g, '').trim() ?? '',
        props.provision.enum?.replace(/<[^>]+>/g, '').trim() ?? '',
        props.provision.provisionType ?? ''
      );
    } else {
      lastAppearedStore.setState(props.provision.provisionTag ?? '');
    }
  }, 100);
  alreadyScrolledTo.value = true;
}

onMounted(() => {
  if (props.currentLocation === props.provision.location) {
    scrollTo();
  }
});

onUpdated(() => {
  if (alreadyScrolledTo.value) { return; }
  if (props.currentLocation === props.provision.location) {
    scrollTo();
  }
});

watch(
  () => props.currentLocation,
  (newLoc) => {
    if (newLoc === props.provision.location) {
      scrollTo();
    }
  }
);

const onMouseout = () => {
  hovered.value = false;
  showMenu.value = false;
}

watch(
  () => isVisible.value,
  (newVal, oldVal) => {
    if (newVal && !oldVal && (props.provision.header || noHeaderTocDisplay(props.provision))) {
      lastAppearedStore.setState(
        props.provision.provisionTag ?? '',
        props.provision.header?.replace(/<[^>]+>/g, '').trim() ?? '',
        props.provision.enum?.replace(/<[^>]+>/g, '').trim() ?? '',
        props.provision.provisionType ?? ''
      );
    }
  }
)

const showMenu = ref(false);
const currentVote = ref<Vote>(NULL);

const onVote = (vote: Vote) => {
  currentVote.value = vote;
  onMouseout();
  toast.info('Your interest in popular government is appreciated.', {
    description: 'Please check back soon for further updates.',
    closeButton: true,
  })
  if (props.provision.packageid) {
    lastVote.setState(props.provision.packageid, props.provision.location, vote);
  }
}

// Process text with hyperlinks for legal references
const processedText = computed(() => {
  let text = props.provision.text ?? '';

  // Replace dynamic placeholders for governance document
  text = text.replace('[DYNAMIC_DATE]', new Date().toDateString());
  text = text.replace('[DYNAMIC_HOSTNAME]', location.hostname);
  if (import.meta.env.VITE_DB_URI) {
    const dbHost = new URL(import.meta.env.VITE_DB_URI).hostname;
    text = text.replace('[DYNAMIC_DATABASE]', dbHost);
  }

  // Executive Order references
  const eoRefs = text.match(/Executive Order( No.)? \d+/g);
  if (eoRefs) {
    text = text.replace(/Executive Order( No.)? \d+/g, function (matched: string) {
      const execOrderNum = matched.split(' ').slice(-1)[0];
      return `<a target="_blank" class="underline text-blue-600 dark:text-blue-500" href="https://www.federalregister.gov/executive-order/${execOrderNum}">${matched}</a>`;
    })
  }

  // U.S. Code references
  const usCodeRefs = text.match(/\d+ U.S.C. \d+\w?/g);
  if (usCodeRefs) {
    text = text.replace(/\d+ U.S.C. \d+\w?/g, function (matched: string) {
      const tok = matched.split(' ');
      const title = tok[0], section = tok[2];
      return `<a target="_blank" class="underline text-blue-600 dark:text-blue-500" href="https://www.law.cornell.edu/uscode/text/${title}/${section}">${matched}</a>`;
    })
  }

  // Federal Register references
  const fedRegRefs = text.match(/\d+ Fed. Reg. \d+/g);
  if (fedRegRefs) {
    text = text.replace(/\d+ Fed. Reg. \d+/g, function (matched: string) {
      const tokens = matched.split(' ');
      const page = tokens.slice(-1)[0];
      const volume = tokens[0];
      return `<a target="_blank" class="underline text-blue-600 dark:text-blue-500" href="http://api.fdsys.gov/link?collection=fr&volume=${volume}&page=${page}">${matched}</a>`;
    })
  }

  // Public Law references
  const publicLawRefs = text.match(/Public Law \d{1,3}–\d{1,4}/g);
  if (publicLawRefs) {
    text = text.replace(/Public Law \d{1,3}–\d{1,4}/g, function (matched: string) {
      const tokens = matched.split(' ');
      const congressLaw = tokens[2];
      if (!congressLaw) return text;
      const [congress, law] = congressLaw.split('–');
      return `<a target="_blank" class="underline text-blue-600 dark:text-blue-500" href="https://www.congress.gov/${congress}/plaws/publ${law}/PLAW-${congress}publ${law}.pdf">${matched}</a>`;
    })
  }

  return text;
});

function indentLevelPadding(provision: DisplayProvision, isMobile: boolean) {
  if (centeredHeader(provision)) {
    return 3.5;
  }
  const indentLevel = provision.indentLevel;
  if (indentLevel <= 3 || !isMobile) { return indentLevel + 0.5 }
  return 3 + ((indentLevel - 3) / 2);
}

</script>

<template>
<div class="provision relative" :class="[provisionType]">
  <div ref="provisionRef" v-if="!isOnlyChildren" :class="`provision-content ${provisionType}-content`"
    class="py-1.5 scroll-mt-24 lg:scroll-mt-16" @mouseover="() => hovered = true" @mouseleave="onMouseout"
    :style="{ paddingLeft: `${(indentLevelPadding(provision, isMobile ?? false))}em` }">
    <span v-if="!!provision.enum && enumText" class="enum" :innerHTML="provision.enum"></span>
    <span v-if="!!provision.header" class="header" :innerHTML="provision.header"></span>
    <SmsSignupAssistant v-if="provisionType === 'sms-signup-assistant'" />
    <SmsExampleFlow v-else-if="provisionType === 'sms-example-flow'" />
    <span v-else-if="provision.header == '<header>Table of contents</header>'"
      class="text block font-sans text-sm bg-secondary text-secondary-foreground rounded-md py-3 px-4 italic">
      The inline table of contents has been removed from this web interface. Click
      <List class="inline" :size="14" /> <span class="hidden lg:inline">on
        the right</span><span class="lg:hidden">below</span> for the interactive table of contents.
    </span>
    <span v-else-if="!!provision.text" class="text font-serif-body" :innerHTML="processedText"></span>
    <div ref="provisionMenu"
      class="absolute left-0 top-0 h-full z-10 flex flex-col select-none pl-2 border-l-2 lg:border-l-3 py-0.5"
      :class="[hovered || currentVote != NULL ? '' : 'hidden', currentVote == AYE ? 'border-emerald-400 dark:border-emerald-500' : currentVote == NAY ? 'border-red-400 dark:border-red-500' : 'border-muted-foreground/70']">
      <Button variant="ghost" :size="'icon-sm'" :class="[hovered ? '' : 'hidden']" @mouseover="() => showMenu = true">
        <component :is="MoreVertical"></component>
      </Button>
      <div v-if="showMenu" class="flex flex-col gap-1">
        <Button v-if="clipboardSupported" variant="ghost" :size="'icon-sm'"
          v-tooltip.right="{ content: copied ? '📋 URL Copied' : 'Copy URL', hideTriggers: ['hover'] }"
          @click="() => copy()">
          <component :is="Link"></component>
        </Button>
        <Button v-if="currentVote === NULL" size="icon-sm" variant="ghostSuccess" @click="() => onVote(AYE)">
          <component :is="Check"></component>
        </Button>
        <Button v-if="currentVote === NULL" size="icon-sm" variant="ghostDestructive" @click="() => onVote(NAY)">
          <component :is="Ban"></component>
        </Button>
      </div>
    </div>
    <div class="absolute right-full top-0 h-full z-10 flex flex-col select-none pr-2 py-0.5"
      :class="[currentVote == NULL ? 'hidden' : '']">
      <div @mouseover="() => showMenu = true">
        <Button v-if="currentVote === AYE" size="icon-sm" variant="success" @click="() => onVote(NULL)">
          <component :is="Check"></component>
        </Button>
        <Button v-if="currentVote === NAY" size="icon-sm" variant="destructive" @click="() => onVote(NULL)">
          <component :is="Ban"></component>
        </Button>
      </div>
    </div>
  </div>
  <Provision v-for="(child, index) of provision.children.filter(d => (d.provisionType ?? '') !== 'table')"
    :provision="child" :ordinal="index" :parent-id="provisionId" :is-mobile="isMobile"
    :currentLocation="currentLocation">
  </Provision>
  <TableProvision v-for="child in provision.children.filter(d => (d.provisionType ?? '') === 'table')"
    :provision="child" />
</div>
</template>

<style>
.dynamic {
  display: inline-block;
  background-color: #f2f2f2;
  font-family: monospace;
  padding: 0.2em 0.7em 0.2em 0em;
  border-radius: 0.5em;
  margin: 2px 0.25em;
  overflow-wrap: break-word;
  max-width: 100%;
}

.dark .dynamic {
  background-color: oklch(27.4% 0.006 286.033);
}
</style>
