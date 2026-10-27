<script setup lang="ts">
import Shell from './Shell.vue';
import { useHead } from '@unhead/vue';

useHead({
  title: 'Terms of Service',
  titleTemplate: '%s - Popular Legislation',
  meta: [
    { name: 'description', content: 'Terms of Service for Popular Legislation, including SMS messaging terms.' }
  ]
});
</script>

<template>
<Shell mobile-page-title="Terms of Service">
  <template #pagetitle>
    <div class="text-2xl font-semibold">Terms of Service</div>
  </template>
  <template #main>
    <div class="prose prose-zinc dark:prose-invert max-w-none px-4 pb-12">
      <p class="text-sm text-muted-foreground">Last updated: October 27, 2026</p>

      <p>
        These Terms of Service (“Terms”) govern use of Popular Legislation (“we,” “us,” or the “Service”),
        operated by Adrian Pearl. By using the Service, including its SMS interface, you agree to these Terms.
      </p>

      <h2>SMS Messaging Terms</h2>
      <p>
        The SMS interface is entirely user-initiated and on-demand. By texting a command to the designated number
        you consent to receive responsive messages related to that command.
      </p>
      <ul>
        <li><strong>Message and data rates may apply.</strong></li>
        <li>Message frequency varies and is limited to replies to commands you send.</li>
        <li>Text <strong>STOP</strong> to cancel. Text <strong>HELP</strong> for help.</li>
        <li>Available commands include HELP, SIGNUP, VOTE, ADD BILL, DELETE ACCOUNT, and STOP.</li>
        <li>Support: contact@populegis.org or populegis.org.</li>
      </ul>
      <p>
        Carriers are not liable for delayed or undelivered messages.
      </p>

      <h2>Program Description</h2>
      <p>
        Popular Legislation is a civic platform that lets users create a public profile of policy views by voting
        on federal legislation. SMS is used only for user-initiated account actions and confirmations
        (account creation, voting, bill requests, account deletion, and help).
      </p>

      <h2>Privacy</h2>
      <p>
        Our <router-link to="/privacy">Privacy Policy</router-link> describes what data we collect and how it is used.
        SMS opt-in data is not shared with third parties for marketing purposes.
      </p>

      <p class="text-sm text-muted-foreground">
        These Terms summarize the relevant provisions of our governance document. The full text is available at
        <router-link to="/governance">/governance</router-link>.
      </p>
    </div>
  </template>
</Shell>
</template>