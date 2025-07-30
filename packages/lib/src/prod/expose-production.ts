import { dirname, relative, resolve } from 'path'
import { OutputChunk } from 'rollup'
import { NAME_CHAR_REG, normalizePath, parseExposeOptions, removeNonRegLetter } from '../utils/index'
import { parsedOptions, SHARED, EXTERNALS, EXPOSES_MAP, EXPOSES_KEY_MAP, DYNAMIC_LOADING_CSS, DYNAMIC_LOADING_CSS_PREFIX, builderInfo } from '../public'
import { getModuleMarker } from '../utils/index'
import { VitePluginFederationOptions } from 'types'
import { PluginHooks } from 'types/pluginHooks'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'

//
export function prodExposePlugin(options: VitePluginFederationOptions): PluginHooks {
  let moduleMap = ''

  const hasOptions = parsedOptions.prodExpose.some((expose) => expose[0] === parseExposeOptions(options)[0]?.[0])
  console.log('hasOptions', hasOptions)

  if (!hasOptions) {
    parsedOptions.prodExpose = Array.prototype.concat(parsedOptions.prodExpose, parseExposeOptions(options))
  }

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

    moduleMap += `\n"${item[0]}":()=>{
      ${DYNAMIC_LOADING_CSS}('${DYNAMIC_LOADING_CSS_PREFIX}${exposeFilepath}', ${item[1].dontAppendStylesToHead}, '${item[0]}')
      return __federation_import('\${__federation_expose_${item[0]}}').then(module =>Object.keys(module).every(item => exportSet.has(item)) ? () => module.default : () => module)},`
  }

  return {
    name: 'vite:expose-production',
    virtualFile: {
      [`__remoteEntryHelper__${options.filename}`]: `
      const currentImports = {}
      const exportSet = new Set(['Module', '__esModule', 'default', '_export_sfc']);
      let moduleMap = {${moduleMap}}
      const seen = {}
      export const ${DYNAMIC_LOADING_CSS} = (cssFilePaths, dontAppendStylesToHead, exposeItemName) => {
        const metaUrl = import.meta.url;
        if (typeof metaUrl === 'undefined') {
          console.warn('The remote style takes effect only when the build.target option in the vite.config.ts file is higher than that of "es2020".');
          return;
        }

        const curUrl = metaUrl.substring(0, metaUrl.lastIndexOf('${options.filename}'));
        const base = __VITE_BASE_PLACEHOLDER__;
        const assetsDir = __VITE_ASSETS_DIR_PLACEHOLDER__;

        cssFilePaths.forEach(cssPath => {
         let href = '';
         const baseUrl = base || curUrl;
         if (baseUrl) {
           const trimmer = {
             trailing: (path) => (path.endsWith('/') ? path.slice(0, -1) : path),
             leading: (path) => (path.startsWith('/') ? path.slice(1) : path)
           }
           const isAbsoluteUrl = (url) => url.startsWith('http') || url.startsWith('//');

           const cleanBaseUrl = trimmer.trailing(baseUrl);
           const cleanCssPath = trimmer.leading(cssPath);
           const cleanCurUrl = trimmer.trailing(curUrl);

           if (isAbsoluteUrl(baseUrl)) {
             href = [cleanBaseUrl, cleanCssPath].filter(Boolean).join('/');
           } else {
            if (cleanCurUrl.includes(cleanBaseUrl)) {
              href = [cleanCurUrl, cleanCssPath].filter(Boolean).join('/');
            } else {
              href = [cleanCurUrl + cleanBaseUrl, cleanCssPath].filter(Boolean).join('/');
            }
           }
         } else {
           href = cssPath;
         }
         
          if (dontAppendStylesToHead) {
            const key = 'css__${options.name}__' + exposeItemName;
            window[key] = window[key] || [];
            window[key].push(href);
            return;
          }

          if (href in seen) return;
          seen[href] = true;

          const element = document.createElement('link');
          element.rel = 'stylesheet';
          element.href = href;
          document.head.appendChild(element);
        });
      };
      async function __federation_import(name) {
        currentImports[name] ??= import(name)
        return currentImports[name]
      };
      export const get =(module) => {
        if(!moduleMap[module]) throw new Error('Can not find remote module ' + module)
        return moduleMap[module]();
      };
      export const init =(shareScope) => {
        globalThis.__federation_shared__= globalThis.__federation_shared__|| {};
        Object.entries(shareScope).forEach(([key, value]) => {
          for (const [versionKey, versionValue] of Object.entries(value)) {
            const scope = versionValue.scope || 'default'
            globalThis.__federation_shared__[scope] = globalThis.__federation_shared__[scope] || {};
            const shared= globalThis.__federation_shared__[scope];
            (shared[key] = shared[key]||{})[versionKey] = versionValue;
          }
        });
      }`
    },

    buildStart() {
      if (parsedOptions.prodExpose?.length) {
        this.emitFile({
          fileName: `${builderInfo.assetsDir ? builderInfo.assetsDir + '/' : ''}${options.filename}`,
          type: 'chunk',
          id: `__remoteEntryHelper__${options.filename}`,
          preserveSignature: 'strict'
        })
      }
    },

    generateBundle(_options, bundle) {
      // console.log('_options, bundle', _options, bundle)
      let remoteEntryChunk
      for (const file in bundle) {
        const chunk = bundle[file] as OutputChunk

        if (chunk.facadeModuleId === `\0virtual:__remoteEntryHelper__${options.filename}`) {
          remoteEntryChunk = chunk
        }
      }

      if (remoteEntryChunk) {
        remoteEntryChunk.code = remoteEntryChunk.code.replace(`__VITE_BASE_PLACEHOLDER__`, `''`).replace('__VITE_ASSETS_DIR_PLACEHOLDER__', `''`)

        for (const expose of parseExposeOptions(options)) {
          const module = Object.keys(bundle).find((module) => {
            const chunk = bundle[module] as OutputChunk
            console.log('chunk', chunk.name)

            return chunk.name === EXPOSES_KEY_MAP.get(expose[0])
          })

          console.log('modlue', module)

          if (module) {
            // console.log('module', module)
            const chunk = bundle[module]
            // console.log('chunk', chunk)
            const fileRelativePath = relative(dirname(remoteEntryChunk.fileName), chunk.fileName)

            const slashPath = fileRelativePath.replace(/\\/g, '/')
            console.log('slashPath', slashPath, expose[0])

            remoteEntryChunk.code = remoteEntryChunk.code.replace(`\${__federation_expose_${expose[0]}}`, `./${slashPath}`)
          }
        }

        // 去掉动态引入样式的代码
        let ast: any = null

        try {
          ast = this.parse(remoteEntryChunk.code)
        } catch (err) {
          console.log('err', err)
        }

        const magicString = new MagicString(remoteEntryChunk.code)
        if (!ast) return

        walk(ast, {
          enter(node: any) {
            if (node && node.type === 'CallExpression' && typeof node.arguments[0]?.value === 'string' && node.arguments[0]?.value.indexOf(`${DYNAMIC_LOADING_CSS_PREFIX}`) > -1) {
              magicString.remove(node.start, node.end + 1)
            }
          }
        })

        remoteEntryChunk.code = magicString.toString()
      }
    }
  }
}
