import { VitePluginFederationOptions } from 'types'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { parsedOptions, devRemotes, builderInfo } from '../public'
import { createRemotesMap, getModuleMarker, parseRemoteOptions, REMOTE_FROM_PARAMETER } from '../utils/index'
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
          ${createRemotesMap(devRemotes)}
            const loadJS = async (url, fn) => {
              const resolvedUrl = typeof url === 'function' ? await url() : url;
              const script = document.createElement('script')
              script.type = 'text/javascript';
              script.onload = fn;
              script.src = resolvedUrl;
              document.getElementsByTagName('head')[0].appendChild(script);
            }
            function get(name, ${REMOTE_FROM_PARAMETER}){
              return import(/* @vite-ignore */ name).then(module => ()=> {
                if (${REMOTE_FROM_PARAMETER} === 'webpack') {
                  return Object.prototype.toString.call(module).indexOf('Module') > -1 && module.default ? module.default : module
                }
                return module
              })
            }
            const wrapShareScope = ${REMOTE_FROM_PARAMETER} => {
              return {
                ${getModuleMarker('shareScope')}
              }
            }
            const initMap = Object.create(null);
            async function __federation_method_ensure(remoteId) {
              const remote = remotesMap[remoteId];
              if (!remote.inited) {
                if ('var' === remote.format) {
                  // loading js with script tag
                  return new Promise(resolve => {
                    const callback = () => {
                      if (!remote.inited) {
                        remote.lib = window[remoteId];
                        remote.lib.init(wrapShareScope(remote.from))
                        remote.inited = true;
                      }
                      resolve(remote.lib);
                    }
                    return loadJS(remote.url, callback);
                  });
                } else if (['esm', 'systemjs'].includes(remote.format)) {
                  // loading js with import(...)
                  return new Promise((resolve, reject) => {
                    const getUrl = typeof remote.url === 'function' ? remote.url : () => Promise.resolve(remote.url);
                    getUrl().then(url => {
                      import(/* @vite-ignore */ url).then(lib => {
                        if (!remote.inited) {
                          const shareScope = wrapShareScope(remote.from)
                          lib.init(shareScope);
                          remote.lib = lib;
                          remote.lib.init(shareScope);
                          remote.inited = true;
                        }
                        resolve(remote.lib);
                      }).catch(reject)
                    })
                  })
                }
              } else {
                return remote.lib;
              }
            }

            function __federation_method_unwrapDefault(module) {
              return (module?.__esModule || module?.[Symbol.toStringTag] === 'Module')?module.default:module
            }

            function __federation_method_wrapDefault(module ,need){
              if (!module?.default && need) {
                let obj = Object.create(null);
                obj.default = module;
                obj.__esModule = true;
                return obj;
              }
              return module; 
            }

            function __federation_method_getRemote(remoteName,  componentName){
              return __federation_method_ensure(remoteName).then((remote) => remote.get(componentName).then(factory => factory()));
            }

            function __federation_method_setRemote(remoteName, remoteConfig) {
              remotesMap[remoteName] = remoteConfig;
            }
            export {__federation_method_ensure, __federation_method_getRemote , __federation_method_setRemote , __federation_method_unwrapDefault , __federation_method_wrapDefault}
      `
        }
      : {
          __federation__: ''
        },

    transform(this: TransformPluginContext, code: string, id: string) {
      let ast

      if (id === '\0virtual:__federation__') {
        return code.replace(getModuleMarker('shareScope'), '')
      }

      try {
        ast = this.parse(code)
        // console.log('ast', ast)
      } catch (e) {
        console.error(e)
      }
      if (!ast) return null
      const magicString = new MagicString(code)
      const hasStaticImported = new Map<string, string>()

      let manualRequired: any = null
      let requiresRuntime = false
      walk(ast, {
        enter(node: any) {
          // console.log('node', node.type, node.source?.value)
          if (node.type === 'ImportDeclaration' && node.source?.value === 'virtual:__federation__') {
            manualRequired = node
          }

          if ((node.type === 'ImportExpression' || node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration') && node.source?.value?.indexOf('/') > -1) {
            // console.log('node', node.source.value)
            const moduleId = node.source.value

            const remote = devRemotes.find((r) => r.regexp.test(moduleId))
            if (remote) {
              const modName = `.${moduleId.slice(remote.id.length)}`

              requiresRuntime = true

              switch (node.type) {
                case 'ImportDeclaration': {
                  if (node.specifiers?.length) {
                    const afterImportName = `__federation_var_${moduleId.replace(/[@/\\.-]/g, '')}`

                    if (!hasStaticImported.has(moduleId)) {
                      magicString.overwrite(
                        node.start,
                        node.end,
                        `const ${afterImportName} = await __federation_method_getRemote(${JSON.stringify(remote.id)} , ${JSON.stringify(modName)});`
                      )
                      hasStaticImported.set(moduleId, afterImportName)
                    }

                    let deconstructStr = ''

                    node.specifiers.forEach((spec) => {
                      if (spec.type === 'ImportDefaultSpecifier') {
                        magicString.appendRight(node.end, `\n let ${spec.local.name} = __federation_method_unwrapDefault(${afterImportName}) `)
                      } else if (spec.type === 'ImportSpecifier') {
                        const importedName = spec.imported.name
                        const localName = spec.local.name
                        deconstructStr += `${localName === importedName ? localName : `${importedName}: ${localName}`}`
                      }
                    })

                    if (deconstructStr?.length) {
                      magicString.appendRight(node.end, `\n let { ${deconstructStr} } = ${afterImportName}`)
                    }
                  }

                  break
                }
              }
            }
          }
        }
      })

      if (requiresRuntime) {
        let requiresCode = `import {__federation_method_ensure, __federation_method_getRemote , __federation_method_wrapDefault , __federation_method_unwrapDefault} from '__federation__';\n\n`

        if (manualRequired) {
          requiresCode = `import {__federation_method_setRemote, __federation_method_ensure, __federation_method_getRemote , __federation_method_wrapDefault , __federation_method_unwrapDefault} from '__federation__';\n\n`
        }
        magicString.prepend(requiresCode)
      }

      return magicString.toString()
    }
  }
}
