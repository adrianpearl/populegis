<!-- src/views/Privacy.vue -->
<script setup lang="ts">
import Shell from './Shell.vue';
import { useHead } from '@unhead/vue';

useHead({
  title: 'Privacy Policy',
  titleTemplate: '%s - Popular Legislation',
  meta: [
    { name: 'description', content: 'Privacy policy for Popular Legislation, including SMS messaging and mobile data practices.' }
  ]
});
</script>

<template>
<Shell mobile-page-title="Privacy Policy">
  <template #pagetitle>
    <div class="text-2xl font-semibold">Privacy Policy</div>
  </template>
  <template #main>
    <div class="prose prose-zinc dark:prose-invert max-w-none px-4 pb-12">
      <p class="text-sm text-muted-foreground">Last updated: October 17, 2026</p>

      <p>
        Popular Legislation (“we,” “us,” or “the Service”) collects limited information to operate a public civic
        platform for viewing and voting on federal legislation.
      </p>

      <h2>Mobile Information and SMS Opt-In Data</h2>
      <p>
        <strong>Mobile information will not be shared with third parties or affiliates for marketing or promotional
          purposes. All other categories exclude text messaging originator opt-in data and consent; this information
          will not be shared with any third parties.</strong>
      </p>
      <p>
        Telephone numbers and SMS consent data are used only to provide the on-demand SMS interface you initiate
        (account verification, HELP, SIGNUP, VOTE, STOP, and related replies). We do not sell, rent, or share mobile
        numbers or SMS opt-in data with third parties for their marketing or promotional use.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>Legal name (first and last)</li>
        <li>State of residence and congressional district</li>
        <li>Telephone number (for SMS services and account verification)</li>
        <li>Email address (if you provide one)</li>
        <li>Votes you cast on bills and provisions</li>
      </ul>

      <h2>How We Use Information</h2>
      <p>
        Information is used solely to operate the Service: maintaining accounts, publishing aggregated and individual
        voting records that form the public civic profile, and responding to SMS commands you send. We do not sell,
        rent, or otherwise transfer user information except as strictly necessary for technical operation of the Service
        or as required by law.
      </p>

      <h2>Public vs. Private Information</h2>
      <p>
        Legal names, congressional districts, and votes are public and form a permanent record of civic participation,
        analogous to the public voting records of elected officials. Telephone numbers and email addresses are kept
        private and are not published through the API or displayed on the site.
      </p>

      <h2>SMS Messaging</h2>
      <p>
        The SMS interface is entirely user-initiated and on-demand. By texting the designated number you consent to
        receive responsive messages. No marketing, promotional, or unsolicited messages are sent.
      </p>
      <ul>
        <li>Message frequency varies (only in direct response to your commands).</li>
        <li>Message and data rates may apply.</li>
        <li>Text STOP to cancel. Text HELP for help.</li>
        <li>Available commands include HELP, SIGNUP, VOTE, ADD BILL, DELETE ACCOUNT, and STOP.</li>
      </ul>

      <h2>Data Retention and Security</h2>
      <p>
        Data is retained while your account is active. Upon account deletion, personal information is permanently
        removed, except for aggregated or anonymized statistical data. We use reasonable security measures, but no
        internet transmission is perfectly secure.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data: <a href="mailto:contact@populegis.org">contact@populegis.org</a>
      </p>

      <p class="text-sm text-muted-foreground mt-8">
        This policy summarizes the privacy and SMS provisions of our governance document. The full text is available at
        <router-link to="/governance" class="underline">/governance</router-link>.
      </p>
    </div>
  </template>
</Shell>
</template>