import { h } from 'vue';
import { toast as sonner, type ExternalToast } from 'vue-sonner';
import ToastBody from '@/components/ToastBody.vue';
import { Vote } from '@/stores/lastVote';

export const twilio_number = '+13477369153';
export const twilio_number_display = '(347) 736-9153';

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

export function isMobile() {
  // 1. Hardware Capability Check: Detect touch primary input
  const hasTouch = window.matchMedia('(pointer: coarse)').matches

  // 2. Software Fallback Check: Basic User Agent validation
  const hasMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

  // Combine both metrics to confidently filter out narrow desktop windows
  return hasTouch || hasMobileUA;
}

export const toast = {
  success: (title: string, description?: string) => show(title, description, undefined, 'success'),
  error: (title: string, description?: string) => show(title, description, undefined, 'error'),
  info: (title: string, description?: string) => show(title, description, undefined, 'info'),
  warning: (title: string, description?: string) => show(title, description, undefined, 'warning'),
  vote: (packageid: string, location = 0, vote: Vote) => {
    const votekey = voteKey(vote);
    const cmd = location ? `VOTE ${packageid} ${location} ${votekey}` : `VOTE ${packageid} ${votekey}`;
    // toast.ts vote()
    return show(
      `Text ${cmd} to ${twilio_number_display}`,
      isMobile() ? 'Tap to text' : 'Click to copy',
      cmd,
      undefined,
      { duration: 8000 },
    );
  },
  dismiss: sonner.dismiss,
};