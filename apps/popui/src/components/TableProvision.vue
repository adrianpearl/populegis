<script setup lang="ts">
import { type PropType } from 'vue';
import { type DisplayProvision } from '../utils';

const props = defineProps({
  provision: {
    type: Object as PropType<DisplayProvision>,
    required: true
  },
  isMobile: {
    type: Boolean
  }
});

</script>

<template>
<div class="pl-8 text-sm py-2 text-left">
  <table v-for="table in provision.children.filter(d => d.provisionType === 'tgroup')">
    <thead v-for="thead in table.children.filter(d => d.provisionType === 'thead')">
      <tr v-for="row in thead.children">
        <th v-for="td in row.children">
          <span :innerHTML="td.text ?? ''"></span>
        </th>
      </tr>
    </thead>
    <tbody v-for="tbody in table.children.filter(d => d.provisionType === 'tbody')">
      <tr v-for="row in tbody.children">
        <td v-for="td in row.children">
          <span :innerHTML="td.text ?? ''"></span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
</template>