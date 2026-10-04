<script setup lang="ts">
import SmsConversation from './SmsConversation.vue';

const attestationText = 'I, the person above identified, affirm my intention to create an account on populegis.org and attest that above I have entered my full legal name and state and congressional district of residence, that I currently have no account, and that I am sending this message from a phone number used exclusively by me. I hereby tender my initial vote on the governance provisions, which I accessed at populegis.org/governance and read in full:';

const messages = [
  { sender: 'user' as const, text: 'SIGNUP' },
  { sender: 'bot' as const, text: 'Welcome to Popular Legislation. Reply YES to confirm you want to create an account and receive automated updates. By replying YES, you consent to our terms at populegis.org/governance. Message frequency varies. Message and data rates may apply. Reply STOP to cancel, HELP for help.' },
  { sender: 'user' as const, text: 'YES' },
  { sender: 'bot' as const, text: 'Confirmed. Please send your account information in the following format: ACCOUNT, username, full name, state, district, attestation text, vote (AYE or NAY). Visit populegis.org/governance/48 for a signup assistant tool.' },
  { sender: 'user' as const, text: `ACCOUNT\nadriaticoyster\nAdrian Pearl\nNY\n10\n${attestationText}\nAYE` },
  { sender: 'bot' as const, text: 'Welcome Adrian. Your account (adriaticoyster) has been created. Visit populegis.org to start voting on bills.' },
];
</script>

<template>
  <SmsConversation :messages="messages" class="my-4" />
</template>
