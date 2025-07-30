/*
 * @Author: phil
 * @Date: 2025-07-30 11:54:29
 */
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended as any,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
])
