import { test as setup, expect } from '@playwright/test'
import { USERS, login } from './helpers'

// Login sekali per role lalu simpan token (localStorage) — backend membatasi 5 login/menit per email.
for (const [role, user] of Object.entries(USERS)) {
  setup(`login sebagai ${role}`, async ({ page }) => {
    await page.goto('/login')
    await login(page, user.email, user.password)
    await expect(page).toHaveURL('/')
    await page.context().storageState({ path: user.state })
  })
}
