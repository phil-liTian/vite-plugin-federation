import { parseRemoteOptions } from "../utils/index";
import { VitePluginFederationOptions } from "types";
import { PluginHooks } from "types/pluginHooks";
import { parsedOptions, prodRemotes } from '../public'



export function prodRemotePlugin(options: VitePluginFederationOptions): PluginHooks {
  console.log('prodRemotePlugin', options);
  parsedOptions.prodRemote = parseRemoteOptions(options)

  console.log('parsedOptions.prodRemote', parsedOptions.prodRemote);
  for (const item of parsedOptions.prodRemote) {
    prodRemotes.push({
      id: item[0],
      regexp: new RegExp(`^${item[0]}/.+?`),
      config: item[1]
    })
  }

  console.log('prodRemotes', prodRemotes);
  
  

  return {
    name: 'vite:remote-production',
    virtualFile: options.remotes ? {
      __federation__: ''
    } : { __federation__: '' },
  }
}

