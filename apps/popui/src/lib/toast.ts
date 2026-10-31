import { h } from 'vue';
import { toast as sonner, type ExternalToast } from 'vue-sonner';
import ToastBody from '@/components/ToastBody.vue';
import { Vote } from '@/stores/lastVote';

export const twilio_number = '(347) 736-9153';

type VoteKey = keyof typeof Vote;
export function voteKey(value: Vote): VoteKey | undefined {
  const entry = Object.entries(Vote).find(([_, val]) => val === value);
  return entry ? (entry[0] as VoteKey) : undefined;
}

function show(
  title: string,
  description?: string,
  copyText?: string,
  type?: 'success' | 'error' | 'info' | 'warning',
  options?: ExternalToast,
) {
  return sonner(h(ToastBody, { title, description, copyText, type }), {
    closeButton: true,
    duration: 5000,
    ...options,
  });
}

export const toast = {
  success: (title: string, description?: string) => show(title, description, undefined, 'success'),
  error: (title: string, description?: string) => show(title, description, undefined, 'error'),
  info: (title: string, description?: string) => show(title, description, undefined, 'info'),
  warning: (title: string, description?: string) => show(title, description, undefined, 'warning'),
  vote: (packageid: string, location = 0, vote: Vote) => {
    const votekey = voteKey(vote);
    const cmd = location ? `VOTE ${packageid} ${location} ${votekey}` : `VOTE ${packageid} ${votekey}`;
    return show(`Text ${cmd} to ${twilio_number}`, 'Click to copy', cmd, undefined, { duration: 8000 });
  },
  dismiss: sonner.dismiss,
};