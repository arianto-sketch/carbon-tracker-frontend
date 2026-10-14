import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const APP_NAME = 'Carbon Tracker'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/auth/LoginView.vue'), meta: { guest: true, title: 'Masuk' } },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { title: 'Dashboard' } },
        { path: 'projects', component: () => import('@/views/projects/ProjectListView.vue'), meta: { title: 'Projects' } },
        { path: 'projects/:id', component: () => import('@/views/projects/ProjectDetailView.vue'), meta: { title: 'Detail Project' } },
        { path: 'projects/:id/entries/new', component: () => import('@/views/entries/EntryFormView.vue'), meta: { title: 'Entri Baru' } },
        { path: 'projects/:id/entries/:entryId/edit', component: () => import('@/views/entries/EntryFormView.vue'), meta: { title: 'Edit Entri' } },
        { path: 'projects/:id/targets/new', component: () => import('@/views/targets/TargetFormView.vue'), meta: { title: 'Target Baru' } },
        { path: 'projects/:id/targets/:targetId/edit', component: () => import('@/views/targets/TargetFormView.vue'), meta: { title: 'Edit Target' } },
        { path: 'reports', component: () => import('@/views/reports/ReportsView.vue'), meta: { title: 'Laporan' } },
        { path: 'reports/summary', component: () => import('@/views/reports/SummaryView.vue'), meta: { title: 'Ringkasan Emisi' } },
        { path: 'profile', component: () => import('@/views/profile/ProfileView.vue'), meta: { title: 'Profil' } },
        { path: 'admin/emission-factors', component: () => import('@/views/admin/EmissionFactorsView.vue'), meta: { adminOnly: true, title: 'Emission Factors' } },
        { path: 'admin/users', component: () => import('@/views/admin/UsersView.vue'), meta: { adminOnly: true, title: 'Users' } },
        { path: '403', name: 'forbidden', component: () => import('@/views/errors/ForbiddenView.vue'), meta: { title: 'Akses ditolak' } },
        // URL tidak dikenal: tampilkan 404 (URL tetap) alih-alih diam-diam pindah ke dashboard
        { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/errors/NotFoundView.vue'), meta: { title: 'Halaman tidak ditemukan' } },
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

// Judul tab mengikuti halaman (dibaca pembaca layar saat berpindah halaman)
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
})

export default router
