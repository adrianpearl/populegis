import { ref, type Ref } from 'vue';
import { toast } from 'vue-sonner';

type Entry = { body: unknown; hasMore: boolean; at: number };
const cache = new Map<string, Entry>();
const TTL_MS = 600_000;

export function useApi<T>(initial: T) {
  const data = ref(initial) as Ref<T>;
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(false);
  let requestId = 0;

  async function run(url: string, opts?: { append?: boolean }) {
    const id = ++requestId;
    if (!opts?.append) {
      const hit = cache.get(url);
      if (hit && Date.now() - hit.at < TTL_MS) {
        data.value = hit.body as T;
        hasMore.value = hit.hasMore;
        error.value = null;
        return;
      }
    }

    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetch(url);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.details || body?.error || response.statusText);
      if (id !== requestId) return;
      const next = opts?.append && Array.isArray(data.value) && Array.isArray(body)
        ? [...data.value, ...body]
        : body;
      data.value = next as T;
      hasMore.value = response.headers.get('X-Has-More') === 'true';
      if (!opts?.append) cache.set(url, { body, hasMore: hasMore.value, at: Date.now() });
    } catch (err: any) {
      if (id !== requestId) return;
      error.value = err?.message || 'Request failed';
      toast.error('Request Failed', {
        description: err?.message
      })
    } finally {
      if (id === requestId) isLoading.value = false;
    }
  }

  return { data, isLoading, error, hasMore, run };
}