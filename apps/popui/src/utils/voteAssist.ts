import { h, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Vote } from '@/stores/lastVote';
import CopyChip from '@/components/CopyChip.vue';

export const twilio_number = '(347) 736-9153';

type VoteKey = keyof typeof Vote;
export function voteKey(value: Vote): VoteKey | undefined {
  const entry = Object.entries(Vote).find(([_, val]) => val === value);
  return entry ? (entry[0] as VoteKey) : undefined;
}

export function voteToast(packageid: string, location: number, vote: Vote) {
  const votekey = voteKey(vote);
  const cmd = location
    ? `VOTE ${packageid} ${location} ${votekey}`
    : `VOTE ${packageid} ${vote}`;

  toast.info('', {
    description: h('span', { class: '' }, [
      'Text ',
      h(CopyChip, { text: cmd }),
      ` to ${twilio_number}`,
    ]),
    closeButton: true,
    duration: 8000,
  });
}