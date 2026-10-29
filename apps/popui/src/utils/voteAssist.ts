import { h, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Vote } from '@/stores/lastVote';
import CopyChip from '@/components/CopyChip.vue';

export const twilio_number = '(347) 736-9153';

export function voteToast(packageid: string, location: number, vote: Vote) {
  const cmd = location
    ? `VOTE ${packageid} ${location} ${vote}`
    : `VOTE ${packageid} ${vote}`;
  const copied = ref(false);

  async function doCopy() {
    const ta = document.createElement('textarea');
    ta.value = cmd;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    // deprecated but required for iOS Firefox
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) {
      copied.value = true;
      setTimeout(() => (copied.value = false), 1500);
    }
  }

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