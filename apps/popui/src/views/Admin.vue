<script setup lang="ts">
import { ref } from 'vue';
import Shell from './Shell.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Loader from '@/components/Loader.vue';
import { JsonViewer } from '@/components/ui/json-viewer';
import { modifyXML, xmlRootProvision, provisionsXMLtoDB, type BillSummary } from '@/utils';
import type { ProvisionRecord } from '@populegis/shared.ts';
import { toast } from "vue-sonner";

type StatusTitle = { titleType: string; title: string };
type StatusBill = {
  type: string;
  number: string;
  congress: string;
  updateDate?: string;
  titles?: StatusTitle[];
  latestAction?: { actionDate: string; text?: string };
  sponsors?: { fullName?: string; party?: string; state?: string; bioguideId?: string }[];
};
type StatusXml = { bill: StatusBill };

const from = ref(new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
const to = ref(new Date().toISOString().slice(0, 10));
const offsetMark = ref('*');
const packages = ref<{ packageId: string; lastModified: string; title?: string }[]>([]);
const loadingList = ref(false);
const loadingPreview = ref(false);
const error = ref('');
const preview = ref<{ packageId: string; summary: BillSummary; status: StatusXml; provisions: ProvisionRecord[], form: string }>();
const loadingUpsert = ref(false);
const upsertButtonText = ref("Upsert");

async function loadModified(reset = false) {
  if (reset) {
    packages.value = [];
    offsetMark.value = '*';
  }
  loadingList.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ from: from.value, to: to.value, offsetMark: offsetMark.value });
    const response = await fetch(`/api/admin/govinfo/modified?${params}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    packages.value = packages.value.concat(body.packages ?? []);
    offsetMark.value = body.nextOffsetMark ?? '';
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    loadingList.value = false;
  }
}

function statusXmlToJson(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const nodes = (node: Node): unknown => {
    if (node.nodeName === '#text') return node.textContent?.trim() ?? '';
    const childNodes = Array.from(node.childNodes).filter((child) => child.nodeType === 1 || child.nodeType === 3);
    if (childNodes.length === 1 && childNodes[0]?.nodeName === '#text') return childNodes[0].textContent?.trim() ?? '';
    const children = childNodes.filter((child) => child.nodeName !== '#text');
    if (children.some((child) => child.nodeName === 'item')) return children.map(nodes);
    return Object.fromEntries(children.map((child) => [child.nodeName, nodes(child)]));
  };
  return nodes(doc.documentElement.parentNode === doc ? doc.documentElement : doc);
}

function billFromPreview(packageid: string, summary: BillSummary, statusXml: StatusXml, form: string) {
  const status = statusXml.bill;
  const displayTitle = status.titles ? status.titles.find((t: { titleType: string }) => t.titleType === 'Display Title')?.title : '';
  const shortTitle = displayTitle ?? status.titles?.slice().sort((a: { title: string }, b: { title: string }) => a.title.length - b.title.length)[0]?.title ?? summary.title;
  return {
    packageid: summary.packageId,
    congress: Number(status.congress),
    session: Number(summary.session),
    billType: status.type,
    originChamber: summary.originChamber,
    number: Number(status.number),
    version: packageid.match(/[a-z]+$/)?.[0] ?? '',
    dateIssued: summary.dateIssued,
    officialTitle: summary.title,
    shortTitle,
    lastModified: summary.lastModified,
    lastAction: status.latestAction?.actionDate ?? null,
    lastUpdate: status.updateDate ?? null,
    currentChamber: summary.currentChamber,
    status,
    sponsor: status.sponsors?.[0] ?? null,
    slug: summary.packageId.replace(/^BILLS-/, ''),
    form,
  };
}

async function upsertBill() {
  if (preview.value == undefined) return;
  loadingUpsert.value = true;
  const { packageId, provisions, status, summary, form } = preview.value;
  const bill = billFromPreview(packageId, summary, status, form);
  await fetch(`/api/admin/bills/${packageId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bill, provisions }),
  }).then((response) => {
    if (!response.ok) {
      // Pass the status text or status code downstream
      throw new Error(`Server responded with status ${response.status}`);
    }
    return response;
  }).then(() => {
    toast.success('Bill upserted.', {
      closeButton: true,
    })
  }).catch((error) => {
    toast.error('Error', {
      description: error
    })
  }).finally(() => { loadingUpsert.value = false; });
}

async function openPackage(packageId: string) {
  loadingPreview.value = true;
  error.value = '';
  preview.value = undefined;
  try {
    const response = await fetch(`/api/admin/govinfo/package?packageid=${encodeURIComponent(packageId)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    const xml = modifyXML(body.xml);
    const provisions = provisionsXMLtoDB(xmlRootProvision(xml), packageId);
    const formElement = xml.getElementsByTagName('form').item(0);
    const form = formElement ? new XMLSerializer().serializeToString(formElement) : '';
    preview.value = {
      packageId,
      summary: body.summary as BillSummary,
      status: statusXmlToJson(body.statusXml) as StatusXml,
      provisions,
      form
    };
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loadingPreview.value = false;
  }
}
</script>

<template>
<Shell mobile-page-title="Source">
  <template #pagetitle>
    <div class="text-2xl font-semibold">Modified bills</div>
  </template>
  <template #main>
    <form class="flex gap-2" @submit.prevent="loadModified(true)">
      <Input type="date" v-model="from" />
      <Input type="date" v-model="to" />
      <Button type="submit">Load</Button>
    </form>
    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <Loader v-if="loadingList && !packages.length" class="mt-4" />
    <div class="mt-4 flex flex-col gap-2 text-sm">
      <button v-for="item of packages" :key="item.packageId" class="text-left hover:bg-accent rounded-sm px-2 py-1"
        @click="openPackage(item.packageId)">
        <span class="font-medium">{{ item.packageId }}</span>
        <span class="ml-2 text-muted-foreground">{{ item.lastModified }}</span>
      </button>
    </div>
    <Button v-if="offsetMark && packages.length" variant="secondary" class="mt-4" @click="loadModified()">
      Next page
    </Button>
    <Loader v-if="loadingPreview" class="mt-6" />
    <div v-else-if="preview" class="mt-6 space-y-4">
      <div class="text-sm">{{ preview.packageId }} · {{ preview.provisions.length }} provisions</div>
      <JsonViewer :data="preview.summary" :default-expanded-level="1" />
      <JsonViewer :data="preview.status" :default-expanded-level="0" />
      <Button @click="upsertBill">
        <Loader v-if="loadingUpsert" />
        <span v-else>{{ upsertButtonText }}</span>
      </Button>
    </div>
  </template>
</Shell>
</template>