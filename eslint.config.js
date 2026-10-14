import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

// Fokus ke kebenaran kode (bug, impor/variabel tak terpakai), bukan gaya penulisan template.
export default tseslint.config(
  { ignores: ['dist/', 'playwright-report/', 'test-results/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Kode lama memakai any di banyak respons API; ditandai sebagai peringatan, bukan error
      '@typescript-eslint/no-explicit-any': 'warn',
      // Nama view/komponen satu kata (mis. "Dashboard") memang dipakai di router
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
