import { TransformPluginContext } from 'rollup'
import { parseRemoteOptions } from '../utils/index'
import { VitePluginFederationOptions } from 'types'
import { PluginHooks } from 'types/pluginHooks'
import { builderInfo, EXPOSES_KEY_MAP, parsedOptions, prodRemotes } from '../public'

export function prodRemotePlugin(options: VitePluginFederationOptions): PluginHooks {
  console.log('prodRemotePlugin', options)
  parsedOptions.prodRemote = parseRemoteOptions(options)

  console.log('parsedOptions.prodRemote', parsedOptions.prodRemote)
  for (const item of parsedOptions.prodRemote) {
    prodRemotes.push({
      id: item[0],
      regexp: new RegExp(`^${item[0]}/.+?`),
      config: item[1]
    })
  }

  console.log('prodRemotes', prodRemotes)

  return {
    name: 'vite:remote-production',
    virtualFile: options.remotes
      ? {
          __federation__: ''
        }
      : { __federation__: '' },

    transform(this: TransformPluginContext, code: string, id: string) {
      // console.log('code', code, id)

      // 是远程项目 提供组件的项目, 生成组件对应的js文件
      if (builderInfo.isRemote) {
        // console.log('builderInfo', builderInfo.isRemote)

        for (const expose of parsedOptions.prodExpose) {
          if (!expose[1]?.emitFile) {
            expose[1].emitFile = this.emitFile({
              type: 'chunk',
              id: expose[1].id ?? expose[1].import,
              name: EXPOSES_KEY_MAP.get(expose[0]),
              preserveSignature: 'allow-extension'
            })
          }
        }
      }
    }
  }
}
