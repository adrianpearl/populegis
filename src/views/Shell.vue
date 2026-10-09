<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ref, toRefs } from 'vue';
import { Button } from '@/components/ui/button';
import { useDark, useToggle } from '@vueuse/core';
import { Home, FileCode2, Database, Sun, Moon, FolderGit2, ExternalLink, Menu, Landmark, FolderLock } from '@lucide/vue';
import Tooltip from '@/components/Tooltip.vue';
import BillSearch from '@/components/BillSearch.vue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const showSource = false; //import.meta.env.VITE_DB_URI.includes('localhost');
const console_url = import.meta.env.VITE_CONSOLE_URL;
const git_url = import.meta.env.VITE_GIT_URL;
const isDark = useDark();
const toggleDark = useToggle(isDark);

const props = defineProps({
  mobilePageTitle: {
    type: String,
    required: true
  },
  logo: Boolean,
  showMobileMainOverlay: Boolean,
  pageLoading: Boolean
});
const { showMobileMainOverlay, pageLoading } = toRefs(props);
const mobileSearch = ref(false);

const showMenu = ref(false);
</script>

<template>
<div class="lg:hidden flex flex-col max-w-full min-h-dvh justify-between">
  <div class="fixed top-0 h-14 w-full px-3 bg-background z-20000">
    <div class="flex h-full justify-between items-center gap-1">
      <div class="flex items-center min-w-0">
        <router-link :to="'/governance'" v-if="logo">
          <span class="material-symbols-outlined filled pt-1.5 px-1">
            history_edu
          </span>
        </router-link>
        <div class="flex items-baseline gap-2 ml-1 min-w-0">
          <span class="text-xl font-bold truncate">{{ mobilePageTitle }}</span>
          <slot name="mobilesubtitle"></slot>
        </div>
      </div>
      <div class="flex gap-2 flex-row">
        <BillSearch mobile v-model:open="mobileSearch" />
        <DropdownMenu @update:open="(payload: boolean) => showMenu = payload">
          <DropdownMenuTrigger as-child>
            <Button size="icon-lg" variant="ghost">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent :align="'start'" class="w-dvw border-none rounded-none px-2 py-3">
            <DropdownMenuItem as-child>
              <router-link :to="'/'">
                <Button class="w-full justify-start" variant="ghost">
                  <Home class="text-primary" /> Home
                </Button>
              </router-link>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="showSource" as-child>
              <router-link :to="'/source'">
                <Button class="w-full justify-start" variant="ghost">
                  <FileCode2 class="text-primary" /> Source
                </Button>
              </router-link>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <router-link :to="'/governance'">
                <Button class="w-full justify-start" variant="ghost">
                  <Landmark class="text-primary" /> Governance
                </Button>
              </router-link>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <router-link :to="'/privacy'">
                <Button class="w-full justify-start" variant="ghost">
                  <FolderLock class="text-primary" /> Privacy
                </Button>
              </router-link>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <a :href="console_url" target="_blank">
                <Button class="w-full justify-start" variant="ghost">
                  <Database class="text-primary" /> API
                  <ExternalLink :size="12" class="ms-auto" />
                </Button>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <a :href="git_url" target="_blank">
                <Button class="w-full justify-start" variant="ghost">
                  <FolderGit2 class="text-primary" /> Source Code
                  <ExternalLink :size="12" class="ms-auto" />
                </Button>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem as-child @click="() => toggleDark()">
              <a>
                <Button class="w-full justify-start" variant="ghost">
                  <Sun class="text-primary" v-if="isDark" />
                  <Moon class="text-primary" v-else /> {{ isDark ? 'Light Mode' : 'Dark Mode' }}
                </Button>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
  <div class="grow relative">
    <div v-if="showMenu" class="fixed inset-0 z-50 bg-gray-800/20 dark:bg-black/50" @click="() => showMenu = false">
    </div>
    <div v-if="showMobileMainOverlay" class="fixed top-14 bottom-12 w-full z-30 bg-zinc-50 dark:bg-zinc-900">
      <slot name="mainOverlay"></slot>
    </div>
    <div class="mt-14">
      <slot name="main"></slot>
    </div>
  </div>
  <div class="fixed bottom-0 w-full z-30 flex flex-col-reverse">
    <slot name="mobileNav"></slot>
  </div>
</div>
<div class="hidden lg:grid grid-cols-12 gap-1">
  <div
    class="xl:col-span-2 pl-6 sticky top-0 h-screen min-h-screen flex flex-col justify-between pt-3.5 xl:pt-0 pb-3.5 bg-background z-20">
    <div class="sticky top-0 bg-background z-20">
      <div class="flex flex-col xl:flex-row gap-0.5 items-start xl:items-center xl:min-h-16 xl:flex-wrap">
        <router-link :to="'/'">
          <Tooltip content="Home">
            <Button variant="ghost" size="icon">
              <component :is="Home"></component>
            </Button>
          </Tooltip>
        </router-link>

        <router-link v-if="showSource" :to="'/source'">
          <Tooltip content="Source">
            <Button variant="ghost" size="icon">
              <component :is="FileCode2"></component>
            </Button>
          </Tooltip>
        </router-link>
        <Tooltip content="API">
          <a :href="console_url" target="_blank">
            <Button variant="ghost" size="icon">
              <component :is="Database"></component>
            </Button>
          </a>
        </Tooltip>
        <Tooltip content="Source Code">
          <a :href="git_url" target="_blank">
            <Button variant="ghost" size="icon">
              <component :is="FolderGit2"></component>
            </Button>
          </a>
        </Tooltip>
        <Tooltip :content="isDark ? 'Light Mode' : 'Dark Mode'">
          <Button variant="ghost" size="icon" @click="toggleDark()">
            <component :is="isDark ? Sun : Moon"></component>
          </Button>
        </Tooltip>
      </div>
    </div>
    <div class="flex">
      <router-link :to="'/governance'" class="lg:hidden">
        <Tooltip content="Governance / Privacy">
          <span
            :class="$route.name == '/governance' ? 'bg-zinc-900/5 dark:text-zinc-200 dark:bg-zinc-100/10' : 'hover:bg-zinc-900/5 active:bg-zinc-900/10 dark:text-zinc-300 dark:hover:bg-zinc-100/10 dark:active:bg-zinc-100/20'"
            class="material-symbols-outlined filled text-gray-800 rounded-sm size-8 p-1">
            history_edu
          </span>
        </Tooltip>

      </router-link>
      <router-link :to="'/governance'" class="hidden lg:block">
        <Tooltip content="Governance / Privacy">
          <span
            :class="$route.name == '/governance' ? 'bg-zinc-900/5 dark:text-zinc-200 dark:bg-zinc-100/10' : 'hover:bg-zinc-900/5 active:bg-zinc-900/10 dark:text-zinc-300 dark:hover:bg-zinc-100/10 dark:active:bg-zinc-100/20'"
            class="material-symbols-outlined large filled text-gray-800 rounded-sm size-11 p-1">
            history_edu
          </span>
        </Tooltip>
      </router-link>
      <div class="hidden xl:flex flex-col">
        <router-link to="/governance" class="h-5">
          <Button variant="link" class="w-fit h-5 py-0 px-2 text-xs">Governance</Button>
        </router-link>
        <router-link to="/privacy" class="h-5">
          <Button variant="link" class="w-fit h-5 py-0 px-2 text-xs">Privacy</Button>
        </router-link>
      </div>
    </div>
  </div>
  <div class="col-span-7 xl:col-span-6 pr-8 flex flex-col relative">
    <div class="sticky top-0 h-16 pl-2 flex justify-between items-center bg-background z-20">
      <div class="flex items-baseline gap-2 max-w-full">
        <slot name="pagetitle"></slot>
        <slot name="subtitle"></slot>
      </div>
    </div>
    <div class="pl-2 pb-2">
      <slot name="main"></slot>
    </div>
  </div>
  <div class="col-span-4 flex flex-col sticky top-0 max-h-dvh">
    <div class="flex gap-2 sticky top-0 h-16 min-h-16 items-center z-20 pr-6 bg-background">
      <BillSearch />
    </div>
    <div class="sticky top-0 max-h-dvh overflow-y-auto">
      <div class="mr-6 mb-6">
        <slot name="sidebar"></slot>
      </div>
    </div>
  </div>
</div>
</template>