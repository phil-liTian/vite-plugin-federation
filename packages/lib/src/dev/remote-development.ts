import { VitePluginFederationOptions } from 'types'
import { parsedOptions } from '../public'
import { parseRemoteOptions } from '../utils/index'

export function devRemotePlugin(options: VitePluginFederationOptions) {
  parsedOptions.devRemote = parseRemoteOptions(options)

  return {
    name: 'vite:remote-development'
  }
}
