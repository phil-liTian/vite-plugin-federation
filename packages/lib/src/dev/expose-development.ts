import { VitePluginFederationOptions } from 'types'
import { parsedOptions } from '../public'
import { parseExposeOptions } from '../utils/index'

export function devExposePlugin(options: VitePluginFederationOptions) {
  parsedOptions.devExpose = parseExposeOptions(options)


  return {
    name: 'vite:expose-development'
  }
}

