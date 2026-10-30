import { ref } from 'vue'
import { defineStore } from 'pinia'

export const Vote = {
  NULL: 'null',
  AYE: 'up',
  NAY: 'down',
} as const;

export type Vote = (typeof Vote)[keyof typeof Vote];

interface ProvisionVote {
  packageid: string;
  location: number;
  vote: Vote;
}

export const voteBgClass = ['', 'bg-emerald-100', 'bg-red-100'];

export const useLastVoteStore = defineStore('lastVote', () => {
  const lastVote = ref<ProvisionVote>();
  const localVotes = ref<Array<ProvisionVote>>([]);
  function setState(packageid: string, location: number, voteType: Vote) {
    const provisionVote = { packageid, location, vote: voteType };
    lastVote.value = provisionVote;
    localVotes.value = localVotes.value.concat(provisionVote);
  }

  return { lastVote, localVotes, setState }
})
