import type { ConfigEnv, ResolvedConfig, UserConfig } from 'vite'
import { VitePluginFederationOptions } from '../types/index'
import { PluginHooks } from '../types/pluginHooks'
import { devSharedPlugin } from './dev/shared-development'
import { devExposePlugin } from './dev/expose-development'
import { devRemotePlugin } from './dev/remote-development'

function federation(options: VitePluginFederationOptions) {
  let pluginList: PluginHooks[] = []
  function registerPlugins(mode: string, command: string) {
    if (mode === 'development' || command === 'serve') {
      // TODO: 测试
      pluginList = [devSharedPlugin(options), devExposePlugin(options), devRemotePlugin(options)]
    } else if (mode === 'production' || command === 'build') {
      // TODO: 生产
    }
  }

  return {
    name: 'vite:federation',
    options: (_options) => {
      console.log('_options----', _options)
    },
    config: (config: UserConfig, env: ConfigEnv) => {
      // console.log("config", config, env);
      options.mode = options.mode ?? env.mode
      registerPlugins(options?.mode, env.command)
    },
    configResolved(config: ResolvedConfig) {
      console.log('ResolvedConfig', pluginList)
      for (const pluginHook of pluginList) {
        console.log('pluginHook.configResolved', pluginHook)

        pluginHook.configResolved?.call(this, config)
      }
    },
    resolveId(...args) {
      console.log('args', args)
    },
    load(...args) {
      console.log('args', args)
    }
  }
}

export default federation
