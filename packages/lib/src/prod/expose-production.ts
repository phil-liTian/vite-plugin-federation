import { resolve } from 'path'
import { OutputChunk } from 'rollup'
import { NAME_CHAR_REG, normalizePath, parseExposeOptions, parseOptions, parseSharedOptions, removeNonRegLetter } from '../utils/index'
import { parsedOptions, SHARED, EXTERNALS, EXPOSES_MAP, EXPOSES_KEY_MAP, DYNAMIC_LOADING_CSS, DYNAMIC_LOADING_CSS_PREFIX, builderInfo } from '../public'
import { getModuleMarker } from '../utils/index'
import { VitePluginFederationOptions } from 'types'
import { PluginHooks } from 'types/pluginHooks'

//
export function prodExposePlugin(options: VitePluginFederationOptions): PluginHooks {
  let moduleMap = ''

  // const hasOptions = parsedOptions.prodExpose.some((expose) => {

  // })

  parsedOptions.prodExpose = Array.prototype.concat(parsedOptions.prodExpose, parseExposeOptions(options))

  // exposes module
  for (const item of parseExposeOptions(options)) {
    const moduleName = getModuleMarker(`\${${item[0]}}`, SHARED)
    EXTERNALS.push(moduleName)
    const exposeFilepath = normalizePath(resolve(item[1].import))
    // {
    //   './Button' => '/Users/litian.phil/phil/vite/phil-vite/federation/packages/example/react-vite/remote/src/components/Button'
    // }
    EXPOSES_MAP.set(item[0], exposeFilepath)
    // { './Button' => '__federation_expose_Button' }
    EXPOSES_KEY_MAP.set(item[0], `__federation_expose_${removeNonRegLetter(item[0], NAME_CHAR_REG)}`)
    moduleMap += `\n"${item[0]}"()=>{
      ${DYNAMIC_LOADING_CSS}('${DYNAMIC_LOADING_CSS_PREFIX}${exposeFilepath}', ${item[1].dontAppendStylesToHead}, '${item[0]}')
      return __federation_import('\${__federation_expose_${item[0]}}').then(module =>Object.keys(module).every(item => exportSet.has(item)) ? () => module.default : () => module)},`

    // console.log('moduleMap', moduleMap)
  }

  return {
    name: 'vite:expose-production',
    virtualFile: {
      [`__remoteEntryHelper__${options.filename}`]: `
      const currentImports = {}
      `
    },
    buildStart() {
      if (parsedOptions.prodExpose?.length) {
        this.emitFile({
          // fileName: `${builderInfo.assetsDir ? builderInfo.assetsDir + '/' : ''}${options.filename}`,
          type: 'chunk',
          id: `__remoteEntryHelper__${options.filename}`
          // preserveSignature: 'strict'
        })
        // this.emitFile({
        //   type: 'asset',
        //   name: 'config.json',
        //   source: JSON.stringify({ version: '1.0.0' })
        // })
      }
    },

    generateBundle(_options, bundle) {
      // console.log('_options, bundle', _options, bundle)
      for (const file in bundle) {
        const chunk = bundle[file] as OutputChunk
        console.log('chunk.facadeModuleId', chunk.facadeModuleId)

        if (chunk.facadeModuleId === `\0virtual:__remoteEntryHelper__${options.filename}`) {
          console.log('chunk-->', chunk)
        }
      }
    }
  }
}
