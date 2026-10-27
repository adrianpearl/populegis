<script setup lang="ts">
import Shell from './Shell.vue';
import { useHead } from '@unhead/vue';
import SmsExampleFlow from '@/components/SmsExampleFlow.vue';

useHead({
  title: 'SMS Opt-In Example',
  titleTemplate: '%s - Popular Legislation',
  meta: [
    { name: 'description', content: 'Example of how users opt in to Popular Legislation SMS by texting SIGNUP.' }
  ]
});
</script>

<template>
<Shell mobile-page-title="SMS Opt-In Example">
  <template #pagetitle>
    <div class="text-2xl font-semibold">SMS Opt-In Example</div>
  </template>
  <template #main>
    <div class="prose prose-zinc dark:prose-invert max-w-none px-4 pb-12">
      <p>
        Users opt in by texting <strong>SIGNUP</strong> to the Popular Legislation number.
        The exchange below shows the consent step and account creation.
      </p>

      <SmsExampleFlow />

      <p>
        Terms of Service: <router-link to="/terms">populegis.org/terms</router-link><br>
        Privacy Policy: <router-link to="/privacy">populegis.org/privacy</router-link>
      </p>
    </div>
  </template>
</Shell>
</template>