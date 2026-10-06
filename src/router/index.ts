import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/auth/LoginView.vue'), meta: { guest: true } },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', component: () => import('@/views/dashboard/DashboardView.vue') },
        { path: 'projects', component: () => import('@/views/projects/ProjectListView.vue') },
        { path: 'projects/:id', component: () => import('@/views/projects/ProjectDetailView.vue') },
        { path: 'projects/:id/entries/new', component: () => import('@/views/entries/EntryFormView.vue') },
        { path: 'projects/:id/entries/:entryId/edit', component: () => import('@/views/entries/EntryFormView.vue') },
        { path: 'projects/:id/targets/new', component: () => import('@/views/targets/TargetFormView.vue') },
        { path: 'projects/:id/targets/:targetId/edit', component: () => import('@/views/targets/TargetFormView.vue') },
        { path: 'reports', component: () => import('@/views/reports/ReportsView.vue') },
        { path: 'profile', component: () => import('@/views/profile/ProfileView.vue') },
        { path: 'admin/emission-factors', component: () => import('@/views/admin/EmissionFactorsView.vue'), meta: { adminOnly: true } },
        { path: 'admin/users', component: () => import('@/views/admin/UsersView.vue'), meta: { adminOnly: true } },
        { path: '403', name: 'forbidden', component: () => import('@/views/errors/ForbiddenView.vue') },
        // URL tidak dikenal: tampilkan 404 (URL tetap) alih-alih diam-diam pindah ke dashboard
        { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/errors/NotFoundView.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Ada token tapi profil belum dimuat (mis. hard refresh): muat dulu sebelum cek role.
  // Jika gagal, fetchMe() sudah memanggil logout() sehingga token terhapus dan cek di bawah mengarah ke /login.
  if (auth.isAuthenticated && !auth.user) await auth.fetchMe()

  if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.guest && auth.isAuthenticated) return '/'
  if (to.meta.adminOnly && !auth.isAdmin) return '/403'
})

export default router
