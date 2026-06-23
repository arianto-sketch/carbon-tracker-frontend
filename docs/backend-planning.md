# Planning Backend Laravel — Carbon Footprint Tracker

**Versi:** 1.0 | **Tanggal:** 2026-06-23 | **Stack:** Laravel 11 + MySQL + Sanctum + Queue

---

## 1. Database Schema

### users
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| name | varchar(255) | |
| email | varchar(255) UNIQUE | |
| password | varchar(255) | bcrypt |
| role | enum(admin, pm, viewer) | default: pm |
| avatar | varchar(255) NULL | |
| is_active | boolean | default: true |
| email_verified_at | timestamp NULL | |
| remember_token | varchar(100) NULL | |
| created_at / updated_at | timestamp | |

### emission_categories
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| name | varchar(255) | Energi, Aktivitas Project, Supply Chain/Vendor |
| slug | varchar(100) UNIQUE | energy, activity, vendor |
| icon | varchar(100) NULL | mdi icon name |
| sort_order | int | default: 0 |
| is_active | boolean | default: true |

### emission_factors
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| category_id | FK → emission_categories | |
| name | varchar(255) | PLN Jawa-Bali, Bensin, dst |
| slug | varchar(100) UNIQUE | |
| source_unit | varchar(50) | kWh, liter, km, kg, galon |
| factor_value | decimal(15,8) | kg CO₂e per satuan |
| source | varchar(255) NULL | referensi data faktor |
| is_active | boolean | default: true |

### projects
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| name | varchar(255) | |
| code | varchar(50) UNIQUE | kode unik project |
| description | text NULL | |
| status | enum(active, completed, archived) | default: active |
| created_by | FK → users | |
| deleted_at | timestamp NULL | soft delete |

### project_members
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| project_id | FK → projects | |
| user_id | FK → users | |
| role | enum(owner, member, viewer) | |
| UNIQUE | (project_id, user_id) | |

### carbon_entries
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| project_id | FK → projects | |
| category_id | FK → emission_categories | |
| emission_factor_id | FK → emission_factors | |
| source_unit | varchar(50) | **snapshot** saat entry dibuat |
| emission_factor_value | decimal(15,8) | **snapshot** saat entry dibuat |
| quantity | decimal(15,4) | |
| co2e_kg | decimal(15,4) | = round(quantity × factor_value, 4) |
| entry_date | date | tanggal aktivitas |
| period_year | int | auto-derive dari entry_date |
| period_month | int | auto-derive dari entry_date |
| status | enum(draft, submitted, approved) | default: draft |
| description | text NULL | |
| vendor_name | varchar(255) NULL | khusus kategori vendor |
| activity_type | varchar(255) NULL | khusus kategori activity |
| created_by | FK → users | |
| deleted_at | timestamp NULL | soft delete |

### carbon_targets
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| project_id | FK → projects | |
| category_id | FK → emission_categories NULL | null = semua kategori |
| period_type | enum(monthly, quarterly, yearly) | |
| period_year | int | |
| period_value | int NULL | bulan (1-12) atau kuartal (1-4) |
| target_co2e_kg | decimal(15,4) | |
| baseline_co2e_kg | decimal(15,4) NULL | |
| notes | text NULL | |
| UNIQUE | (project_id, category_id, period_type, period_year, period_value) | |

### audit_logs
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users NULL | |
| action | varchar(50) | created, updated, deleted |
| model_type | varchar(255) | |
| model_id | bigint | |
| old_values | json NULL | |
| new_values | json NULL | |
| ip_address | varchar(45) NULL | |

### report_jobs
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| status | enum(pending, processing, done, failed) | |
| filters | json | {period_year, period_month_from, period_month_to, format} |
| file_path | varchar(500) NULL | path file hasil export |
| format | varchar(10) | xlsx / csv |
| error | text NULL | pesan error jika gagal |
| job_id | varchar(255) NULL | Laravel queue job ID |

---

## 2. API Endpoints (35 total, prefix `/api/v1`)

### Auth
| Method | Path | Deskripsi |
|---|---|---|
| POST | /auth/login | Login, return Sanctum token |
| POST | /auth/logout | Revoke token |
| GET | /auth/me | Data user yang login |
| PUT | /auth/profile | Update nama |
| PUT | /auth/password | Ganti password |

### Projects
| Method | Path | Deskripsi |
|---|---|---|
| GET | /projects | List project (scope by user) |
| POST | /projects | Buat project baru |
| GET | /projects/{id} | Detail project |
| PUT | /projects/{id} | Edit project |
| DELETE | /projects/{id} | Soft delete |
| GET | /projects/{id}/members | List members |
| POST | /projects/{id}/members | Tambah member |
| DELETE | /projects/{id}/members/{userId} | Hapus member |
| GET | /projects/{id}/summary | Summary emisi project |

### Carbon Entries
| Method | Path | Deskripsi |
|---|---|---|
| GET | /projects/{id}/entries | List entries (filter: status, year, month, category) |
| POST | /projects/{id}/entries | Buat entry baru |
| GET | /projects/{id}/entries/{entryId} | Detail entry |
| PUT | /projects/{id}/entries/{entryId} | Edit entry (draft only) |
| DELETE | /projects/{id}/entries/{entryId} | Hapus entry (draft only) |
| POST | /projects/{id}/entries/{entryId}/submit | Submit entry |
| POST | /projects/{id}/entries/{entryId}/approve | Approve entry (admin/PM) |
| POST | /projects/{id}/entries/bulk | Bulk create entries |

### Carbon Targets
| Method | Path | Deskripsi |
|---|---|---|
| GET | /projects/{id}/targets | List targets |
| POST | /projects/{id}/targets | Buat target |
| GET | /projects/{id}/targets/{targetId} | Detail target + progress actual |
| PUT | /projects/{id}/targets/{targetId} | Edit target |
| DELETE | /projects/{id}/targets/{targetId} | Hapus target |

### Dashboard
| Method | Path | Deskripsi |
|---|---|---|
| GET | /dashboard/summary | Total CO2, jumlah project, entries bulan ini |
| GET | /dashboard/trend | Data 12 bulan terakhir |
| GET | /dashboard/category-breakdown | CO2 per kategori (untuk donut chart) |
| GET | /dashboard/top-entries | 10 entry terbesar |

### Emission Categories & Factors
| Method | Path | Deskripsi |
|---|---|---|
| GET | /categories | List semua kategori aktif |
| GET | /emission-factors | List factors (filter: category_id, is_active) |
| POST | /emission-factors | Buat factor (admin) |
| PUT | /emission-factors/{id} | Edit factor (admin) |
| DELETE | /emission-factors/{id} | Deactivate factor (admin) |

### Reports
| Method | Path | Deskripsi |
|---|---|---|
| POST | /reports/generate | Queue report job |
| GET | /reports/status/{jobId} | Cek status job |
| GET | /reports/history | Riwayat report |
| GET | /reports/download/{jobId} | Download file |

---

## 3. Emission Calculation

```php
co2e_kg = round(quantity × emission_factor_value, 4)
```

- `emission_factor_value` di-**snapshot** saat entry dibuat (bukan FK live)
- `source_unit` juga di-snapshot
- Tujuan: historis tidak berubah jika faktor emisi diperbarui admin

---

## 4. Entry Status Flow

```
draft → submitted → approved
         ↑
   (hanya draft yang bisa diedit/dihapus)
```

---

## 5. Fase Implementasi

| Fase | Scope | Estimasi |
|---|---|---|
| Fase 1 | Migrations + Models + Seeders | 1 hari |
| Fase 2 | Auth API (login, logout, me, profile, password) | 0.5 hari |
| Fase 3 | Projects + Members API | 1 hari |
| Fase 4 | Carbon Entries + Targets API | 2 hari |
| Fase 5 | Dashboard + Emission Factors + Reports (async) | 1.5 hari |

**Total: ~6 hari kerja**

---

## 6. Seeds

| Data | Detail |
|---|---|
| Users | admin@logique.co.id (admin), arianto@logique.co.id (pm) — password: "password" |
| Categories | Konsumsi Energi (energy), Aktivitas Project (activity), Supply Chain/Vendor (vendor) |
| Emission Factors | PLN Jawa-Bali (0.87), PLN Sumatra (0.84), Bensin (2.31), Solar (2.68), Penerbangan domestik (0.255), Penerbangan internasional (0.195), Kertas A4 (2.0), Air galon (0.44) |

---

*Planning awal — update jika ada perubahan arsitektur atau endpoint.*
