import { h } from 'vue';
import { toast as sonner, type ExternalToast } from 'vue-sonner';
import ToastBody from '@/components/ToastBody.vue';
import { twilio_number } from '@/utils/voteAssist';
import { Vote } from '@/stores/lastVote';

type VoteKey = keyof typeof Vote;
export function voteKey(value: Vote): VoteKey | undefined {
  const entry = Object.entries(Vote).find(([_, val]) => val === value);
  return entry ? (entry[0] as VoteKey) : undefined;
}

function show(title: string, description?: string, copyText?: string, options?: ExternalToast) {
  return sonner(h(ToastBody, { title, description, copyText }), {
    closeButton: true,
    duration: 5000,
    ...options,
  });
}

export const toast = {
  success: (title: string, description?: string) => show(title, description),
  error: (title: string, description?: string) => show(title, description),
  info: (title: string, description?: string) => show(title, description),
  vote: (packageid: string, location = 0, vote: Vote) => {
    const votekey = voteKey(vote);
    const cmd = location ? `VOTE ${packageid} ${location} ${votekey}` : `VOTE ${packageid} ${votekey}`;
    return show('Vote locally recorded', `to ${twilio_number}`, cmd, { duration: 8000 });
  },
  dismiss: sonner.dismiss,
};