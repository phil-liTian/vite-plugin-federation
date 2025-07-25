import { VitePluginFederationOptions } from 'types'
import { walk } from 'estree-walker'
import { parsedOptions, devRemotes, builderInfo } from '../public'
import { parseRemoteOptions } from '../utils/index'
import { TransformPluginContext } from 'rollup'

export function devRemotePlugin(options: VitePluginFederationOptions) {
  parsedOptions.devRemote = parseRemoteOptions(options)

  for (const item of parsedOptions.devRemote) {
    devRemotes.push({
      id: item[0],
      regexp: new RegExp(`^${item[0]}/.+?`),
      config: item[1]
    })
  }

  const needHandleFileType = ['.js']

  return {
    name: 'vite:remote-development',
    virtualFile: options.remotes
      ? {
          __federation__: `
        const loadJS = async (url, fn) => {
          const resolvedUrl = typeof url === 'function' ? await url() : url;
          const script = document.createElement('script')
          script.type = 'text/javascript';
          script.onload = fn;
          script.src = resolvedUrl;
          console.log('resolvedUrl', resolvedUrl)
          document.getElementsByTagName('head')[0].appendChild(script);
        }
      `
        }
      : {
          __federation__: ''
        },
    transform(this: TransformPluginContext, code: string, id: string) {
      let ast
      try {
        ast = this.parse(code)
        // console.log('ast', ast)
      } catch (e) {
        console.error(e)
      }
      let manualRequired: any = null

      walk(ast, {
        enter(node: any) {
          // console.log('node', node.type, node.source?.value)
          if (node.type === 'ImportDeclaration' && node.source?.value === 'virtual:__federation__') {
            manualRequired = node
          }

          if ((node.type === 'ImportExpression' || node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration') && node.source?.value?.indexOf('/') > -1) {
            // console.log('node', node.source.value)
            const moduleId = node.source.value
            console.log('moduleId', moduleId)

            const remote = devRemotes.find((r) => r.regexp.test(moduleId))
            console.log('remote', remote)
          }
        }
      })
    }
  }
}
