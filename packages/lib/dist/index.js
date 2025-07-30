import * as path from "path";
import { posix, resolve, relative, dirname } from "path";
import MagicString from "magic-string";
const PREFIX = `\0virtual:`;
function virtual(modules) {
  const resolvedIds = /* @__PURE__ */ new Map();
  Object.keys(modules).forEach((id) => {
    resolvedIds.set(path.resolve(id), modules[id]);
  });
  return {
    name: "virtual",
    resolveId(id, importer) {
      if (id in modules)
        return PREFIX + id;
      if (importer) {
        const importerNoPrefix = importer.startsWith(PREFIX) ? importer.slice(PREFIX.length) : importer;
        const resolved = path.resolve(path.dirname(importerNoPrefix), id);
        if (resolvedIds.has(resolved))
          return PREFIX + resolved;
      }
      return null;
    },
    load(id) {
      if (id.startsWith(PREFIX)) {
        const idNoPrefix = id.slice(PREFIX.length);
        return idNoPrefix in modules ? modules[idNoPrefix] : resolvedIds.get(idNoPrefix);
      }
      return null;
    }
  };
}
const SHARED = "shared";
const EXPOSES_MAP = /* @__PURE__ */ new Map();
const EXPOSES_KEY_MAP = /* @__PURE__ */ new Map();
const DYNAMIC_LOADING_CSS = "dynamicLoadingCss";
const DYNAMIC_LOADING_CSS_PREFIX = "__v__css__";
const prodRemotes = [];
const devRemotes = [];
const builderInfo = {
  assetsDir: "",
  isRemote: false
};
const parsedOptions = {
  // dev
  devShared: [],
  devExpose: [],
  devRemote: [],
  prodExpose: [],
  prodRemote: []
};
function parseOptions(options, normalizeSimple, normalizeOptions) {
  if (!options) return [];
  const list = [];
  const array = (items) => {
    for (const item of items) {
      if (typeof item === "string") {
        list.push([item, normalizeOptions(item, item)]);
      } else if (typeof item === "object") ;
      else {
        throw new Error("Unexpected options format");
      }
    }
  };
  const object = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" || Array.isArray(value)) {
        list.push([key, normalizeSimple(value, key)]);
      } else {
        list.push([key, normalizeOptions(value, key)]);
      }
    }
  };
  if (Array.isArray(options)) {
    array(options);
  } else if (typeof options === "object") {
    object(options);
  } else {
    throw new Error("Unexpected options format");
  }
  return list;
}
function parseSharedOptions(options) {
  return parseOptions(
    options.shared || {},
    (item) => {
      return {};
    },
    (item) => {
      return {};
    }
  );
}
function parseRemoteOptions(options) {
  return parseOptions(
    options.remotes || {},
    (item) => {
      return {
        external: Array.isArray(item) ? item : [item],
        shareScope: "default",
        format: "esm",
        from: "vite",
        externalType: "url"
      };
    },
    (item) => {
      return {};
    }
  );
}
function parseExposeOptions(options) {
  return parseOptions(
    options.exposes || {},
    (item) => {
      return {
        import: item,
        name: void 0,
        dontAppendStylesToHead: false
      };
    },
    (item) => {
      return {};
    }
  );
}
function getModuleMarker(value, type) {
  return `__rf_${type || "placeholder"}__${value}`;
}
function normalizePath(id) {
  return posix.normalize(id.replace(/\\/g, "/"));
}
const NAME_CHAR_REG = new RegExp("[0-9a-zA-Z@_-]+");
const letterReg = new RegExp("[0-9a-zA-Z]+");
function removeNonRegLetter(str, reg = letterReg) {
  let needUpperCase = false;
  let ret = "";
  for (const c of str) {
    if (reg.test(c)) {
      ret += needUpperCase ? c.toUpperCase() : c;
      needUpperCase = false;
    } else {
      needUpperCase = true;
    }
  }
  return ret;
}
function createRemotesMap(remotes) {
  const createUrl = (remote) => {
    const external = remote.config.external[0];
    const externalType = remote.config.externalType;
    if (externalType === "promise") {
      return `()=>${external}`;
    } else {
      return `'${external}'`;
    }
  };
  return `const remotesMap = {
${remotes.map((remote) => `'${remote.id}':{url:${createUrl(remote)},format:'${remote.config.format}',from:'${remote.config.from}'}`).join(",\n  ")}
};`;
}
const REMOTE_FROM_PARAMETER = "remoteFrom";
function devSharedPlugin(options) {
  parsedOptions.devShared = parseSharedOptions(options);
  return {
    name: "vite:shared-development"
  };
}
function devExposePlugin(options) {
  parsedOptions.devExpose = parseExposeOptions(options);
  return {
    name: "vite:expose-development"
  };
}
class WalkerBase {
  constructor() {
    this.should_skip = false;
    this.should_remove = false;
    this.replacement = null;
    this.context = {
      skip: () => this.should_skip = true,
      remove: () => this.should_remove = true,
      replace: (node) => this.replacement = node
    };
  }
  /**
   * @template {Node} Parent
   * @param {Parent | null | undefined} parent
   * @param {keyof Parent | null | undefined} prop
   * @param {number | null | undefined} index
   * @param {Node} node
   */
  replace(parent, prop, index, node) {
    if (parent && prop) {
      if (index != null) {
        parent[prop][index] = node;
      } else {
        parent[prop] = node;
      }
    }
  }
  /**
   * @template {Node} Parent
   * @param {Parent | null | undefined} parent
   * @param {keyof Parent | null | undefined} prop
   * @param {number | null | undefined} index
   */
  remove(parent, prop, index) {
    if (parent && prop) {
      if (index !== null && index !== void 0) {
        parent[prop].splice(index, 1);
      } else {
        delete parent[prop];
      }
    }
  }
}
class SyncWalker extends WalkerBase {
  /**
   *
   * @param {SyncHandler} [enter]
   * @param {SyncHandler} [leave]
   */
  constructor(enter, leave) {
    super();
    this.should_skip = false;
    this.should_remove = false;
    this.replacement = null;
    this.context = {
      skip: () => this.should_skip = true,
      remove: () => this.should_remove = true,
      replace: (node) => this.replacement = node
    };
    this.enter = enter;
    this.leave = leave;
  }
  /**
   * @template {Node} Parent
   * @param {Node} node
   * @param {Parent | null} parent
   * @param {keyof Parent} [prop]
   * @param {number | null} [index]
   * @returns {Node | null}
   */
  visit(node, parent, prop, index) {
    if (node) {
      if (this.enter) {
        const _should_skip = this.should_skip;
        const _should_remove = this.should_remove;
        const _replacement = this.replacement;
        this.should_skip = false;
        this.should_remove = false;
        this.replacement = null;
        this.enter.call(this.context, node, parent, prop, index);
        if (this.replacement) {
          node = this.replacement;
          this.replace(parent, prop, index, node);
        }
        if (this.should_remove) {
          this.remove(parent, prop, index);
        }
        const skipped = this.should_skip;
        const removed = this.should_remove;
        this.should_skip = _should_skip;
        this.should_remove = _should_remove;
        this.replacement = _replacement;
        if (skipped) return node;
        if (removed) return null;
      }
      let key;
      for (key in node) {
        const value = node[key];
        if (value && typeof value === "object") {
          if (Array.isArray(value)) {
            const nodes = (
              /** @type {Array<unknown>} */
              value
            );
            for (let i = 0; i < nodes.length; i += 1) {
              const item = nodes[i];
              if (isNode(item)) {
                if (!this.visit(item, node, key, i)) {
                  i--;
                }
              }
            }
          } else if (isNode(value)) {
            this.visit(value, node, key, null);
          }
        }
      }
      if (this.leave) {
        const _replacement = this.replacement;
        const _should_remove = this.should_remove;
        this.replacement = null;
        this.should_remove = false;
        this.leave.call(this.context, node, parent, prop, index);
        if (this.replacement) {
          node = this.replacement;
          this.replace(parent, prop, index, node);
        }
        if (this.should_remove) {
          this.remove(parent, prop, index);
        }
        const removed = this.should_remove;
        this.replacement = _replacement;
        this.should_remove = _should_remove;
        if (removed) return null;
      }
    }
    return node;
  }
}
function isNode(value) {
  return value !== null && typeof value === "object" && "type" in value && typeof value.type === "string";
}
function walk(ast, { enter, leave }) {
  const instance = new SyncWalker(enter, leave);
  return instance.visit(ast, null);
}
function devRemotePlugin(options) {
  parsedOptions.devRemote = parseRemoteOptions(options);
  for (const item of parsedOptions.devRemote) {
    devRemotes.push({
      id: item[0],
      regexp: new RegExp(`^${item[0]}/.+?`),
      config: item[1]
    });
  }
  return {
    name: "vite:remote-development",
    virtualFile: options.remotes ? {
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
                ${getModuleMarker("shareScope")}
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
    } : {
      __federation__: ""
    },
    transform(code, id) {
      let ast;
      if (id === "\0virtual:__federation__") {
        return code.replace(getModuleMarker("shareScope"), "");
      }
      try {
        ast = this.parse(code);
      } catch (e) {
        console.error(e);
      }
      if (!ast) return null;
      const magicString = new MagicString(code);
      const hasStaticImported = /* @__PURE__ */ new Map();
      let manualRequired = null;
      let requiresRuntime = false;
      walk(ast, {
        enter(node) {
          var _a, _b, _c, _d;
          if (node.type === "ImportDeclaration" && ((_a = node.source) == null ? void 0 : _a.value) === "virtual:__federation__") {
            manualRequired = node;
          }
          if ((node.type === "ImportExpression" || node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration") && ((_c = (_b = node.source) == null ? void 0 : _b.value) == null ? void 0 : _c.indexOf("/")) > -1) {
            const moduleId = node.source.value;
            const remote = devRemotes.find((r) => r.regexp.test(moduleId));
            if (remote) {
              const modName = `.${moduleId.slice(remote.id.length)}`;
              requiresRuntime = true;
              switch (node.type) {
                case "ImportDeclaration": {
                  if ((_d = node.specifiers) == null ? void 0 : _d.length) {
                    const afterImportName = `__federation_var_${moduleId.replace(/[@/\\.-]/g, "")}`;
                    if (!hasStaticImported.has(moduleId)) {
                      magicString.overwrite(
                        node.start,
                        node.end,
                        `const ${afterImportName} = await __federation_method_getRemote(${JSON.stringify(remote.id)} , ${JSON.stringify(modName)});`
                      );
                      hasStaticImported.set(moduleId, afterImportName);
                    }
                    let deconstructStr = "";
                    node.specifiers.forEach((spec) => {
                      if (spec.type === "ImportDefaultSpecifier") {
                        magicString.appendRight(node.end, `
 let ${spec.local.name} = __federation_method_unwrapDefault(${afterImportName}) `);
                      } else if (spec.type === "ImportSpecifier") {
                        const importedName = spec.imported.name;
                        const localName = spec.local.name;
                        deconstructStr += `${localName === importedName ? localName : `${importedName}: ${localName}`}`;
                      }
                    });
                    if (deconstructStr == null ? void 0 : deconstructStr.length) {
                      magicString.appendRight(node.end, `
 let { ${deconstructStr} } = ${afterImportName}`);
                    }
                  }
                  break;
                }
              }
            }
          }
        }
      });
      if (requiresRuntime) {
        let requiresCode = `import {__federation_method_ensure, __federation_method_getRemote , __federation_method_wrapDefault , __federation_method_unwrapDefault} from '__federation__';

`;
        if (manualRequired) {
          requiresCode = `import {__federation_method_setRemote, __federation_method_ensure, __federation_method_getRemote , __federation_method_wrapDefault , __federation_method_unwrapDefault} from '__federation__';

`;
        }
        magicString.prepend(requiresCode);
      }
      return magicString.toString();
    }
  };
}
function prodExposePlugin(options) {
  let moduleMap = "";
  const hasOptions = parsedOptions.prodExpose.some((expose) => {
    var _a;
    return expose[0] === ((_a = parseExposeOptions(options)[0]) == null ? void 0 : _a[0]);
  });
  console.log("hasOptions", hasOptions);
  if (!hasOptions) {
    parsedOptions.prodExpose = Array.prototype.concat(parsedOptions.prodExpose, parseExposeOptions(options));
  }
  for (const item of parseExposeOptions(options)) {
    getModuleMarker(`\${${item[0]}}`, SHARED);
    const exposeFilepath = normalizePath(resolve(item[1].import));
    EXPOSES_MAP.set(item[0], exposeFilepath);
    EXPOSES_KEY_MAP.set(item[0], `__federation_expose_${removeNonRegLetter(item[0], NAME_CHAR_REG)}`);
    moduleMap += `
"${item[0]}":()=>{
      ${DYNAMIC_LOADING_CSS}('${DYNAMIC_LOADING_CSS_PREFIX}${exposeFilepath}', ${item[1].dontAppendStylesToHead}, '${item[0]}')
      return __federation_import('\${__federation_expose_${item[0]}}').then(module =>Object.keys(module).every(item => exportSet.has(item)) ? () => module.default : () => module)},`;
  }
  return {
    name: "vite:expose-production",
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
      var _a;
      if ((_a = parsedOptions.prodExpose) == null ? void 0 : _a.length) {
        this.emitFile({
          fileName: `${builderInfo.assetsDir ? builderInfo.assetsDir + "/" : ""}${options.filename}`,
          type: "chunk",
          id: `__remoteEntryHelper__${options.filename}`,
          preserveSignature: "strict"
        });
      }
    },
    generateBundle(_options, bundle) {
      let remoteEntryChunk;
      for (const file in bundle) {
        const chunk = bundle[file];
        if (chunk.facadeModuleId === `\0virtual:__remoteEntryHelper__${options.filename}`) {
          remoteEntryChunk = chunk;
        }
      }
      if (remoteEntryChunk) {
        remoteEntryChunk.code = remoteEntryChunk.code.replace(`__VITE_BASE_PLACEHOLDER__`, `''`).replace("__VITE_ASSETS_DIR_PLACEHOLDER__", `''`);
        for (const expose of parseExposeOptions(options)) {
          const module = Object.keys(bundle).find((module2) => {
            const chunk = bundle[module2];
            console.log("chunk", chunk.name);
            return chunk.name === EXPOSES_KEY_MAP.get(expose[0]);
          });
          console.log("modlue", module);
          if (module) {
            const chunk = bundle[module];
            const fileRelativePath = relative(dirname(remoteEntryChunk.fileName), chunk.fileName);
            const slashPath = fileRelativePath.replace(/\\/g, "/");
            console.log("slashPath", slashPath, expose[0]);
            remoteEntryChunk.code = remoteEntryChunk.code.replace(`\${__federation_expose_${expose[0]}}`, `./${slashPath}`);
          }
        }
        let ast = null;
        try {
          ast = this.parse(remoteEntryChunk.code);
        } catch (err) {
          console.log("err", err);
        }
        const magicString = new MagicString(remoteEntryChunk.code);
        if (!ast) return;
        walk(ast, {
          enter(node) {
            var _a, _b;
            if (node && node.type === "CallExpression" && typeof ((_a = node.arguments[0]) == null ? void 0 : _a.value) === "string" && ((_b = node.arguments[0]) == null ? void 0 : _b.value.indexOf(`${DYNAMIC_LOADING_CSS_PREFIX}`)) > -1) {
              magicString.remove(node.start, node.end + 1);
            }
          }
        });
        remoteEntryChunk.code = magicString.toString();
      }
    }
  };
}
function prodRemotePlugin(options) {
  console.log("prodRemotePlugin", options);
  parsedOptions.prodRemote = parseRemoteOptions(options);
  console.log("parsedOptions.prodRemote", parsedOptions.prodRemote);
  for (const item of parsedOptions.prodRemote) {
    prodRemotes.push({
      id: item[0],
      regexp: new RegExp(`^${item[0]}/.+?`),
      config: item[1]
    });
  }
  console.log("prodRemotes", prodRemotes);
  return {
    name: "vite:remote-production",
    virtualFile: options.remotes ? {
      __federation__: ""
    } : { __federation__: "" },
    transform(code, id) {
      var _a;
      if (builderInfo.isRemote) {
        for (const expose of parsedOptions.prodExpose) {
          if (!((_a = expose[1]) == null ? void 0 : _a.emitFile)) {
            expose[1].emitFile = this.emitFile({
              type: "chunk",
              id: expose[1].id ?? expose[1].import,
              name: EXPOSES_KEY_MAP.get(expose[0]),
              preserveSignature: "allow-extension"
            });
          }
        }
      }
    }
  };
}
function federation(options) {
  let pluginList = [];
  let virtualMod;
  function registerPlugins(mode, command) {
    if (mode === "development" || command === "serve") {
      pluginList = [devSharedPlugin(options), devExposePlugin(options), devRemotePlugin(options)];
    } else if (mode === "production" || command === "build") {
      pluginList = [prodExposePlugin(options), prodRemotePlugin(options)];
    }
    builderInfo.isRemote = !!(parsedOptions.devExpose.length || parsedOptions.prodExpose.length);
    let virtualFiles = {};
    pluginList.forEach((plugin) => {
      if (plugin.virtualFile) {
        virtualFiles = Object.assign(virtualFiles, plugin.virtualFile);
      }
    });
    virtualMod = virtual(virtualFiles);
  }
  return {
    name: "vite:federation",
    enforce: "post",
    options: (_options) => {
      console.log("_options----");
    },
    config: (config, env) => {
      var _a;
      console.log("config2----");
      options.mode = options.mode ?? env.mode;
      builderInfo.assetsDir = ((_a = config.build) == null ? void 0 : _a.assetsDir) ?? "assets";
      registerPlugins(options == null ? void 0 : options.mode, env.command);
    },
    configResolved(config) {
      var _a;
      console.log(
        "configResolved----"
        // config.plugins.map((v) => v.name)
      );
      for (const pluginHook of pluginList) {
        (_a = pluginHook.configResolved) == null ? void 0 : _a.call(this, config);
      }
    },
    resolveId(...args) {
      const v = virtualMod.resolveId.call(this, ...args);
      if (v) return v;
      if (args[0] === "virtual:__federation__") {
        return {
          id: "\0virtual:__federation__",
          moduleSideEffects: true
        };
      }
    },
    // TODO
    load(...args) {
      const v = virtualMod.load.call(this, ...args);
      if (v) return v;
      return null;
    },
    buildStart(inputOptions) {
      var _a;
      for (const pluginHook of pluginList) {
        (_a = pluginHook.buildStart) == null ? void 0 : _a.call(this, inputOptions);
      }
    },
    generateBundle(_options, bundle, isWrite) {
      var _a;
      console.log("generateBundle----->");
      for (const pluginHook of pluginList) {
        (_a = pluginHook.generateBundle) == null ? void 0 : _a.call(this, _options, bundle, isWrite);
      }
    },
    transform(code, id) {
      var _a;
      for (const pluginHook of pluginList) {
        const result = (_a = pluginHook.transform) == null ? void 0 : _a.call(this, code, id);
        if (result) {
          return result;
        }
      }
      return code;
    }
  };
}
export {
  federation as default
};
