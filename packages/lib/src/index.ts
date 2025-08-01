import type { ConfigEnv, ResolvedConfig, UserConfig } from 'vite'
import virtual from '@rollup/plugin-virtual'
import { VitePluginFederationOptions } from '../types/index'
import { PluginHooks } from '../types/pluginHooks'
import { devSharedPlugin } from './dev/shared-development'
import { devExposePlugin } from './dev/expose-development'
import { devRemotePlugin } from './dev/remote-development'
import { prodExposePlugin } from './prod/expose-production'
import { prodRemotePlugin } from './prod/remote-production'
import { builderInfo, parsedOptions } from './public'

function federation(options: VitePluginFederationOptions) {
  let pluginList: PluginHooks[] = []
  // 虚拟模块 用于生成remoteEntry.js 和 load federation
  let virtualMod
  // let registerCount = 0
  function registerPlugins(mode: string, command: string) {
    if (mode === 'development' || command === 'serve') {
      // TODO: 测试
      pluginList = [devSharedPlugin(options), devExposePlugin(options), devRemotePlugin(options)]
    } else if (mode === 'production' || command === 'build') {
      // TODO: 生产
      pluginList = [prodExposePlugin(options), prodRemotePlugin(options)]
    }

    builderInfo.isRemote = !!(parsedOptions.devExpose.length || parsedOptions.prodExpose.length)

    let virtualFiles = {}
    pluginList.forEach((plugin) => {
      if (plugin.virtualFile) {
        virtualFiles = Object.assign(virtualFiles, plugin.virtualFile)
      }
    })
    virtualMod = virtual(virtualFiles)
  }

  return {
    name: 'vite:federation',
    enforce: 'post',
    options: (_options) => {
      // 处理input
      if (typeof _options.input === 'string') {
        _options.input = { index: _options.input }
      }

      for (const pluginHook of pluginList) {
        pluginHook.options?.call(this, _options)
      }

      return _options
    },
    config: (config: UserConfig, env: ConfigEnv) => {
      options.mode = options.mode ?? env.mode
      builderInfo.assetsDir = config.build?.assetsDir ?? 'assets'
      registerPlugins(options?.mode, env.command)
    },
    configResolved(config: ResolvedConfig) {
      for (const pluginHook of pluginList) {
        pluginHook.configResolved?.call(this, config)
      }
    },
    resolveId(...args) {
      const v = virtualMod.resolveId.call(this, ...args)
      // virtual:__remoteEntryHelper__remoteEntry.js
      if (v) return v

      if (args[0] === 'virtual:__federation__') {
        return {
          id: '\0virtual:__federation__',
          moduleSideEffects: true
        }
      }
    },
    // TODO
    load(...args) {
      const v = virtualMod.load.call(this, ...args)

      if (v) return v
      return null
      // console.log('args', args)
    },

    buildStart(inputOptions) {
      console.log('_options', inputOptions.input)

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
    },

    transform(code: string, id: string) {
      for (const pluginHook of pluginList) {
        const result = pluginHook.transform?.call(this, code, id)
        if (result) {
          return result
        }
      }
      return code
    }
  }
}

export default federation
