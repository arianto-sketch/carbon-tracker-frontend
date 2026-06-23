# Planning Frontend Vue.js — Carbon Footprint Tracker

**Versi:** 1.0 | **Tanggal:** 2026-06-23 | **Stack:** Vue 3 + Vite + Vuetify 3 + ApexCharts + Pinia

---

## 1. Struktur Folder

```
src/
├── assets/
├── components/
│   ├── common/          # AppNavbar, AppSidebar, ConfirmDialog, StatusChip, EmptyState
│   ├── charts/          # TrendLineChart, CategoryPieChart, TargetProgressChart
│   ├── dashboard/       # SummaryCard, TopEntriesTable
│   ├── entries/         # EntryForm, BulkUploadDialog
│   ├── projects/        # ProjectCard, MembersPanel
│   └── targets/         # TargetForm
├── composables/         # useAuth, usePagination, useNotification, useConfirm
├── layouts/
│   ├── AuthLayout.vue   # Untuk login page
│   └── AppLayout.vue    # Sidebar + navbar (semua halaman authenticated)
├── plugins/
│   ├── vuetify.ts
│   └── apexcharts.ts
├── router/
│   └── index.ts
├── services/            # Axios wrappers per domain
│   ├── api.ts           # Axios instance + interceptors
│   ├── auth.service.ts
│   ├── projects.service.ts
│   ├── entries.service.ts
│   ├── categories.service.ts
│   ├── targets.service.ts
│   ├── dashboard.service.ts
│   └── reports.service.ts
├── stores/              # Pinia stores
│   ├── auth.store.ts
│   ├── dashboard.store.ts
│   └── ui.store.ts
├── utils/
│   ├── formatters.ts    # CO2 unit, date, number formatting
│   └── constants.ts
└── views/
    ├── auth/            # LoginView
    ├── dashboard/       # DashboardView
    ├── projects/        # ProjectListView, ProjectDetailView
    ├── entries/         # EntryFormView
    ├── targets/         # TargetFormView
    ├── admin/           # EmissionFactorsView
    ├── reports/         # ReportsView
    └── profile/         # ProfileView
```

---

## 2. Routes

| Path | View | Guard |
|---|---|---|
| `/login` | LoginView | Guest only |
| `/` | DashboardView | Auth |
| `/projects` | ProjectListView | Auth |
| `/projects/:id` | ProjectDetailView | Auth |
| `/projects/:id/entries/new` | EntryFormView | Auth |
| `/projects/:id/entries/:entryId/edit` | EntryFormView | Auth |
| `/projects/:id/targets/new` | TargetFormView | Auth |
| `/projects/:id/targets/:targetId/edit` | TargetFormView | Auth |
| `/admin/emission-factors` | EmissionFactorsView | Auth + Admin |
| `/reports` | ReportsView | Auth |
| `/profile` | ProfileView | Auth |

---

## 3. Axios Instance & Interceptors (`api.ts`)

```
Request Interceptor:
  → Set Authorization: Bearer {token} dari localStorage

Response Interceptor:
  → 401: clear token → redirect /login
  → lainnya: return Promise.reject(error)
```

---

## 4. Pinia Stores

| Store | State | Actions utama |
|---|---|---|
| `auth.store` | user, token, loading | login(), logout(), fetchMe() |
| `dashboard.store` | summary, trendData, categoryBreakdown, topEntries | fetchDashboard() — parallel Promise.all |
| `ui.store` | snackbar | showSnackbar(), showError() |

---

## 5. Fase Pengerjaan

### Fase 1 — Fondasi
- Setup Vite + Vue 3 + TypeScript
- Install Vuetify 3, Pinia, Vue Router, Axios, ApexCharts
- `api.ts` — Axios instance + interceptors
- `AuthLayout.vue` + `AppLayout.vue` (sidebar + navbar)
- Router + guards
- `ui.store` (snackbar global)

### Fase 2 — Auth & Dashboard
- `auth.store` + `auth.service`
- `LoginView.vue` — form + validasi + redirect
- `dashboard.service` + `dashboard.store`
- `DashboardView.vue` — summary cards, trend chart (ApexCharts area), donut pie, top entries table

### Fase 3 — Projects & Entries
- `projects.service`
- `ProjectListView.vue` — grid cards + create dialog
- `ProjectDetailView.vue` — 4 tabs: Entries, Targets, Members, Summary
- `entries.service`
- `EntryFormView.vue` — live CO2 estimation, category-filtered factors

### Fase 4 — Targets & Summary
- `targets.service`
- `TargetFormView.vue` — period-based target, period_value untuk monthly/quarterly
- Progress bar per target di tab Targets

### Fase 5 — Admin, Reports, Profile
- `EmissionFactorsView.vue` — CRUD table (admin only)
- `ReportsView.vue` — generate async + polling 3s + download history
- `ProfileView.vue` — update nama + ganti password

### Fase 6 — Polish (opsional)
- Loading skeleton
- Empty state component
- Responsive check
- Error page (404, 403)

**Total estimasi: ~12 hari kerja**

---

## 6. Konvensi

| Aspek | Keputusan |
|---|---|
| Error handling | Service lempar error → ui.store.showError() |
| CO2 formatting | `formatters.ts` — otomatis kg/ton di threshold 1000 kg |
| Role check | Router guard `adminOnly` + `v-if` di template |
| TypeScript | Gunakan `any` minimal, interface di `/types` |

---

*Planning awal — update jika ada keputusan implementasi yang berbeda.*
