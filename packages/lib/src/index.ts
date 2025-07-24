import type { ConfigEnv, ResolvedConfig, UserConfig } from 'vite'
import virtual from '@rollup/plugin-virtual'
import { VitePluginFederationOptions } from '../types/index'
import { PluginHooks } from '../types/pluginHooks'
import { devSharedPlugin } from './dev/shared-development'
import { devExposePlugin } from './dev/expose-development'
import { devRemotePlugin } from './dev/remote-development'
import { prodExposePlugin } from './prod/expose-production'

function federation(options: VitePluginFederationOptions) {
  let pluginList: PluginHooks[] = []
  let virtualMod
  function registerPlugins(mode: string, command: string) {
    if (mode === 'development' || command === 'serve') {
      // TODO: 测试
      pluginList = [devSharedPlugin(options), devExposePlugin(options), devRemotePlugin(options)]
    } else if (mode === 'production' || command === 'build') {
      // TODO: 生产
      pluginList = [prodExposePlugin(options)]
    }

    let virtualFiles = {}
    pluginList.forEach((plugin) => {
      if (plugin.virtualFile) {
        virtualFiles = Object.assign(virtualFiles, plugin.virtualFile)
      }
    })

    virtualMod = virtual(virtualFiles)
    console.log('virtualFiles', virtualMod)
  }

  return {
    name: 'vite:federation',
    options: (_options) => {
      // console.log('_options----', _options)
    },
    config: (config: UserConfig, env: ConfigEnv) => {
      // console.log("config", config, env);
      options.mode = options.mode ?? env.mode
      registerPlugins(options?.mode, env.command)
    },
    configResolved(config: ResolvedConfig) {
      for (const pluginHook of pluginList) {
        // console.log('pluginHook.configResolved', pluginHook)
        // pluginHook.configResolved?.call(this, config)
      }
    },
    resolveId(...args) {
      const v = virtualMod.resolveId.call(this, ...args)
      console.log('resolveId======>', v)

      if (v) return v
    },
    // TODO
    load(...args) {
      const v = virtualMod.load.call(this, ...args)
      // console.log('v----->', v)
      if (v) return v
      return null
      // console.log('args', args)
    },
    buildStart(inputOptions) {

      for (const pluginHook of pluginList) {
        pluginHook.buildStart?.call(this, inputOptions)
      }
    },

    generateBundle(_options, bundle, isWrite) {
      // console.log('generateBundle--', _options)
      console.log('generateBundle----->')
      for (const pluginHook of pluginList) {
        pluginHook.generateBundle?.call(this, _options, bundle, isWrite)
      }
    }
  }
}

export default federation
