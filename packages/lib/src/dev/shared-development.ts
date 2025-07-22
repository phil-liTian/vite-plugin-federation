/*
 * @Author: phil
 * @Date: 2025-07-17 19:54:16
 */
import { VitePluginFederationOptions } from 'types'
import { parsedOptions } from '../public'
import { parseSharedOptions } from '../utils/index'

export function devSharedPlugin(options: VitePluginFederationOptions) {
  parsedOptions.devShared = parseSharedOptions(options)

  return {
    name: 'vite:shared-development'
  }
}
