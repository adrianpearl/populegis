import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLastAppearedStore = defineStore('lastAppeared', () => {
  const provisionTag = ref('');
  const timestamp = ref(-1);
  const header = ref('');
  const enumText = ref('');
  const provisionType = ref('');

  function setState(newTag: string, newHeader?: string, newEnum?: string, newType?: string) {
    provisionTag.value = newTag;
    if (newHeader !== undefined) header.value = newHeader;
    if (newEnum !== undefined) enumText.value = newEnum;
    if (newType !== undefined) provisionType.value = newType;
  }
  function setTime(newTime: number) {
    timestamp.value = newTime;
  }

  return { provisionTag, timestamp, header, enumText, provisionType, setState, setTime }
})
