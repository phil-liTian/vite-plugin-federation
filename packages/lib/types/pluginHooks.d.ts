/*
 * @Author: phil
 * @Date: 2025-07-17 21:25:15
 */
import type { Plugin as VitePlugin } from 'vite'

export interface PluginHooks extends VitePlugin {
  virtualFile?: Record<string, unknown>
}
