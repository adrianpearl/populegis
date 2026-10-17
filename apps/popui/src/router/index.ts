import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Bill from '@/views/Bill.vue'
import Admin from '@/views/Admin.vue'
import VoteList from '../views/VoteList.vue'
import Governance from '@/views/Governance.vue'
import { isValidGovInfoPackageId } from '@/utils'
import Privacy from '@/views/Privacy.vue'

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
      props: (route) => {
        const slug = String(route.params.slug ?? '')
        const location = route.params.location ? Number(route.params.location) : undefined
        const candidate = `BILLS-${slug}`

        if (isValidGovInfoPackageId(candidate)) {
          return { packageid: candidate, location }
        }
        return { titleSlug: slug, location }
      }
    },
    {
      path: '/governance/:location?',
      name: 'governance',
      component: Governance,
      props: (route) => ({
        documentId: 'META-1',
        location: route.params.location ? Number(route.params.location) : undefined
      })
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: Privacy,
    },
    {
      path: '/profile/:username',
      name: 'person',
      component: VoteList,
    },
  ],
})

export default router
