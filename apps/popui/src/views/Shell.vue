<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed, ref, toRefs } from 'vue';
import { Button } from '@/components/ui/button';
import { useDark, useToggle } from '@vueuse/core';
import { Home, FileCode2, Database, Sun, Moon, FolderGit2, ExternalLink, Menu, X, Landmark, FolderLock } from '@lucide/vue';
import Tooltip from '@/components/Tooltip.vue';
import BillSearch from '@/components/BillSearch.vue';
import NavItem from '@/components/NavItem.vue';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';

const showSource = false; //import.meta.env.VITE_DB_URI.includes('localhost');
const console_url = import.meta.env.VITE_CONSOLE_URL;
const git_url = 'https://github.com/adrianpearl/populegis';
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

const navItems = computed(() => [
  {
    props: { to: '/' },
    tooltip: 'Home',
    icon: Home,
    show: true
  },
  {
    props: { to: '/governance' },
    tooltip: 'Governance',
    icon: Landmark,
    show: true
  },
  {
    props: { to: '/privacy' },
    tooltip: 'Privacy',
    icon: FolderLock,
    show: true
  },
  {
    props: { to: '/source' },
    tooltip: 'Source',
    icon: FileCode2,
    show: showSource // Dynamic visibility
  },
  {
    props: { href: console_url, target: '_blank' },
    tooltip: 'API',
    icon: Database,
    show: false
  },
  {
    props: { href: git_url, target: '_blank' },
    tooltip: 'Source Code',
    icon: FolderGit2,
    show: true
  },
  {
    props: {},
    tooltip: isDark.value ? 'Light Mode' : 'Dark Mode',
    icon: isDark.value ? Sun : Moon,
    action: toggleDark, // Triggers click handler
    show: true
  }
])
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
        <BillSearch mobile v-model:open="mobileSearch" :disabled="showMenu" />
        <Sheet v-model:open="showMenu">
          <SheetTrigger as-child>
            <Button size="icon-lg" variant="ghost" class="relative overflow-hidden">
              <Transition mode="out-in" enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 scale-75 -rotate-45" leave-active-class="transition duration-100 ease-in"
                leave-to-class="opacity-0 scale-75 rotate-45">
                <!-- Show close icon when open, menu icon when closed -->
                <X v-if="showMenu" class="size-6" />
                <Menu v-else class="size-6" />
              </Transition>
            </Button>
          </SheetTrigger>
          <SheetContent
            class="top-14 h-[calc(100dvh-3.5rem)] w-full max-w-none border-none rounded-none p-2 overflow-y-auto">
            <div class="h-full flex flex-col justify-between">
              <div class="flex flex-col gap-1">
                <NavItem v-for="item in navItems.filter(d => d.show)" :key="item.tooltip" large :to="item.props.to"
                  :href="item.props.href" :icon="item.icon" :label="item.tooltip" :action="item.action" />
              </div>
              <div class="text-xs text-muted-foreground mt-8 p-4">
                To participate via text, you will soon be able to text SIGNUP to a dedicated number.
                Message and data rates may apply. Message frequency varies.
                Text STOP to cancel, HELP for help.
                View our <router-link to="/terms" class="underline text-foreground">Terms of Service</router-link>
                and <router-link to="/privacy" class="underline text-foreground">Privacy Policy</router-link>.
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </div>
  <div class="grow relative">
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
  <div class="xl:col-span-2 pl-6 sticky top-0 self-start flex flex-col gap-6 pb-4 bg-background z-20">
    <div class="flex items-center h-16">
      <router-link :to="'/governance'">
        <span
          :class="$route.name == '/governance' ? 'bg-zinc-900/5 dark:text-zinc-200 dark:bg-zinc-100/10' : 'hover:bg-zinc-900/5 active:bg-zinc-900/10 dark:text-zinc-300 dark:hover:bg-zinc-100/10 dark:active:bg-zinc-100/20'"
          class="material-symbols-outlined large filled text-gray-800 rounded-sm size-11 p-1">
          history_edu
        </span>
      </router-link>
    </div>
    <div class="sticky top-0 bg-background z-20">
      <div class="flex flex-col gap-0.5 items-start xl:hidden">
        <Tooltip v-for="item in navItems.filter(d => d.show)" :key="item.tooltip" :content="item.tooltip"
          placement="right">
          <NavItem :to="item.props.to" :href="item.props.href" :icon="item.icon" :action="item.action" />
        </Tooltip>
      </div>
      <div class="hidden xl:flex flex-col gap-1 items-start">
        <NavItem v-for="item in navItems.filter(d => d.show)" :key="item.tooltip" :to="item.props.to"
          :href="item.props.href" :icon="item.icon" :label="item.tooltip" :action="item.action" />
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
  <div class="col-span-4 flex flex-col sticky top-0 h-dvh max-h-dvh justify-between">
    <div class="flex flex-col sticky top-0 grow overflow-y-auto">
      <div class="flex gap-2 sticky top-0 h-16 min-h-16 items-center z-20 pr-6 bg-background pl-1">
        <BillSearch />
      </div>
      <div class="overflow-y-auto">
        <div class="mr-6 mb-6">
          <slot name="sidebar"></slot>
        </div>
      </div>
    </div>
    <div class="sticky bottom-0">
      <div class="mr-6 my-4">
        <div class="text-xs text-muted-foreground">
          To participate via text, you will soon be able to text SIGNUP to a dedicated number. Message and data rates
          may apply. Message frequency varies. Text STOP to cancel, HELP for help. View our <router-link to="/terms"
            class="text-xs text-foreground hover:underline cursor-pointer text-nowrap">Terms of
            Service</router-link> and
          <router-link to="/privacy" class="text-xs text-foreground hover:underline cursor-pointer text-nowrap">Privacy
            Policy</router-link>.
        </div>
      </div>
    </div>
  </div>
</div>
</template>