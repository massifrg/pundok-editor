import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('src/PundokApp.vue')
  },
  // {
  //   path: '/about',
  //   name: 'about',
  //   component: () => import('src/pages/AboutPage.vue')
  // },
  // // 404
  // {
  //   path: '/:catchAll(.*)*',
  //   name: 'not-found',
  //   component: () => import('src/pages/NotFound.vue')
  // }
]

export default routes
