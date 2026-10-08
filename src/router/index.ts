import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Bill from '@/views/Bill.vue'
import Admin from '@/views/Admin.vue'
import VoteList from '../views/VoteList.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/admin',
      name: 'admin',
      component: Admin,
    },
    {
      path: '/bill/:slug/:location?',
      name: 'bill',
      component: Bill,
      props: (route) => ({
        packageid: `BILLS-${route.params.slug}`,
        location: route.params.location ? Number(route.params.location) : undefined
      })
    },
    {
      path: '/profile/:username',
      name: 'person',
      component: VoteList,
    },
  ],
})

export default router
