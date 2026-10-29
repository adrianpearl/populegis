<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { useLastVoteStore, Vote } from '../stores/lastVote';
import { useRoute } from 'vue-router';

const route = useRoute();
const lastVote = useLastVoteStore();

const username = ref('');
const firstName = ref('');
const lastName = ref('');
const state = ref('');
const district = ref('');

const US_STATES_AND_TERRITORIES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'AS', 'DC', 'GU', 'MP', 'PR', 'VI'
];

const currentVote = computed(() => {
  const votes = lastVote.localVotes.filter(
    v => v.packageid === 'META-1' && v.location === 0
  );
  if (votes.length > 0) {
    return votes[votes.length - 1]?.vote;
  }
  return Vote.NULL;
});

const voteString = computed(() => {
  if (currentVote.value === Vote.AYE) return 'AYE';
  if (currentVote.value === Vote.NAY) return 'NAY';
  return '';
});

const districtStr = computed(() => String(district.value || '').trim());
const cleanUsername = computed(() => username.value.toLowerCase().replace(/[^a-z0-9]/g, ''));

const isValid = computed(() => {
  return cleanUsername.value.length >= 3 &&
    firstName.value.trim() !== '' &&
    lastName.value.trim() !== '' &&
    state.value !== '' &&
    districtStr.value !== '' &&
    /^\d+$/.test(districtStr.value) &&
    voteString.value !== '';
});

const attestationText = 'I, the person above identified, affirm my intention to create an account on populegis.org and attest that above I have entered my full legal name and state and congressional district of residence, that I currently have no account, and that I am sending this message from a phone number used exclusively by me. I hereby tender my initial vote on the governance provisions, which I accessed at populegis.org/governance and read in full:';

const signupMessage = computed(() => {
  if (!isValid.value) return '';

  return `ACCOUNT
${cleanUsername.value}
${firstName.value.trim()} ${lastName.value.trim()}
${state.value}
${districtStr.value}
${attestationText}
${voteString.value}`;
});

const { copy, copied, isSupported } = useClipboard({ source: signupMessage, legacy: true });

async function copyMessage() {
  if (!isValid.value) {
    toast.error(voteString.value === ''
      ? 'Please cast a vote on the governance provisions using the voting buttons above'
      : 'Please fill out all fields correctly');
    return;
  }
  // iOS Firefox: force the legacy path synchronously in the gesture
  const ta = document.createElement('textarea');
  ta.value = signupMessage.value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  // execCommand is deprecated but needed for iOS Firefox
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);

  if (ok) {
    toast.success('Message copied', { description: 'Paste into your SMS app and send to the Popular Legislation number.' });
  } else {
    toast.error('Copy failed', { description: 'Select the message text and copy it manually.' });
  }
}
</script>

<template>
<div class="my-4 font-sans">
  <div v-if="!voteString" class="text-sm text-center text-muted-foreground">
    Please cast your vote on the governance provisions using the voting buttons <span class="hidden lg:inline">on the
      right</span><span class="lg:hidden">at the bottom of your screen</span> to access the signup
    form.
  </div>

  <div v-else class="space-y-4">
    <p class="text-sm text-muted-foreground">
      Before using this form, you should complete steps 1 and 2 from Section 10(f) and 10(g) above:
    </p>
    <ol class="text-sm text-muted-foreground list-decimal list-inside space-y-1">
      <li>Text <strong>SIGNUP</strong> to initiate account creation</li>
      <li>Reply <strong>YES</strong> to confirm consent</li>
      <li>Then fill out this form and copy/send the generated message</li>
    </ol>

    <div class="space-y-2">
      <label for="username" class="text-sm font-medium">Username (alphanumeric, min 3 characters)</label>
      <Input id="username" v-model="username" placeholder="georgewashington" />
      <p v-if="username && cleanUsername" class="text-xs text-muted-foreground">
        Will be saved as: {{ cleanUsername }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <label for="firstName" class="text-sm font-medium">First Name</label>
        <Input id="firstName" v-model="firstName" placeholder="George" />
      </div>

      <div class="space-y-2">
        <label for="lastName" class="text-sm font-medium">Last Name</label>
        <Input id="lastName" v-model="lastName" placeholder="Washington" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <label for="state" class="text-sm font-medium">State/Territory</label>
        <select id="state" v-model="state"
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors">
          <option value="" disabled>Select state or territory</option>
          <option v-for="s in US_STATES_AND_TERRITORIES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="space-y-2">
        <label for="district" class="text-sm font-medium">Congressional District</label>
        <Input id="district" v-model="district" placeholder="12" type="number" min="1" />
      </div>
    </div>

    <div class="text-sm p-3 bg-muted rounded-md">
      <span class="font-medium">Your vote:</span> {{ voteString }}
    </div>

    <div v-if="isValid" class="space-y-2">
      <label class="text-sm font-medium">Generated Message</label>
      <div class="bg-background border rounded-md p-3 font-mono text-sm whitespace-pre-wrap">{{ signupMessage }}</div>
    </div>

    <Button @click="copyMessage" v-if="isValid" class="w-full">
      <component :is="copied ? Check : Copy" class="mr-2 h-4 w-4" />
      {{ copied ? 'Copied!' : 'Copy Message' }}
    </Button>
  </div>
</div>
</template>
