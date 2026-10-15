<template>
<div class="flex flex-col gap-2">
  <div v-for="option of options" class="flex gap-2 items-start">
    <input :id="option" type="checkbox" class="accent-blue-600 mt-0.5" :checked="model.includes(option)"
      @change="(e) => model = (e.target as HTMLInputElement).checked ? model.concat(option) : model.filter(d => d != option)" />
    <label :for="option" class="text-sm">{{ option }}</label>
  </div>
</div>
</template>

<script setup lang="ts">
const model = defineModel({ type: Array<string>, required: true })
const { options } = defineProps({
  options: Array<string>
})
</script>