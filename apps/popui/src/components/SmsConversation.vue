<script setup lang="ts">
interface Message {
  sender: 'user' | 'bot';
  text: string;
}

defineProps<{
  messages: Message[];
}>();
</script>

<template>
  <div class="space-y-3 p-4 bg-muted/30 rounded-lg border font-sans">
    <div
      v-for="(message, index) in messages"
      :key="index"
      class="flex"
      :class="message.sender === 'user' ? 'justify-end' : 'justify-start'"
    >
      <div
		class="max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap wrap-break-word"
        :class="
          message.sender === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        "
      >
        {{ message.text }}
      </div>
    </div>
  </div>
</template>
