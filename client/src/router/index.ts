import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/personal',
    },
    {
      path: '/personal',
      name: 'personal',
      component: () => import('@/pages/PersonalJourney.vue'),
    },
    {
      path: '/dual',
      name: 'dual',
      component: () => import('@/pages/DualMap.vue'),
    },
    {
      path: '/anydoor',
      name: 'anydoor',
      component: () => import('@/pages/AnyDoor.vue'),
    },
  ],
})

export default router