<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'

const name = ref('Unknown')

const getName = async () => {
  const res = await fetch('/api/')
  const data = await res.json()
  name.value = data.name
}
</script>

<template>
  <RouterView />
</template>