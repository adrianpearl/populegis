// src/composables/useApi.ts
import { ref } from 'vue';

export function useApi<T>(initial: T) {
  const data = ref(initial) as { value: T };
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(false);
  let requestId = 0;

  async function run(url: string, opts?: { append?: boolean }) {
    const id = ++requestId;
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetch(url);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.details || body?.error || response.statusText);
      }
      if (id !== requestId) return;
      data.value = (opts?.append && Array.isArray(data.value) && Array.isArray(body)
        ? [...data.value, ...body]
        : body) as T;
      hasMore.value = response.headers.get('X-Has-More') === 'true';
    } catch (err: any) {
      if (id !== requestId) return;
      error.value = err?.message || 'Request failed';
    } finally {
      if (id === requestId) isLoading.value = false;
    }
  }

  return { data, isLoading, error, hasMore, run };
}