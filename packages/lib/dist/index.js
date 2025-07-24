import * as path from "path";
import { posix, resolve } from "path";
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
const parsedOptions = {
  // dev
  devShared: [],
  devExpose: [],
  devRemote: [],
  prodExpose: []
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
      console.log("item-->", item);
      return {};
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
  return `__rf_${type}__${value}`;
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
function devRemotePlugin(options) {
  parsedOptions.devRemote = parseRemoteOptions(options);
  return {
    name: "vite:remote-development"
  };
}
function prodExposePlugin(options) {
  let moduleMap = "";
  parsedOptions.prodExpose = Array.prototype.concat(parsedOptions.prodExpose, parseExposeOptions(options));
  for (const item of parseExposeOptions(options)) {
    getModuleMarker(`\${${item[0]}}`, SHARED);
    const exposeFilepath = normalizePath(resolve(item[1].import));
    EXPOSES_MAP.set(item[0], exposeFilepath);
    EXPOSES_KEY_MAP.set(item[0], `__federation_expose_${removeNonRegLetter(item[0], NAME_CHAR_REG)}`);
    moduleMap += `
"${item[0]}"()=>{
      ${DYNAMIC_LOADING_CSS}('${DYNAMIC_LOADING_CSS_PREFIX}${exposeFilepath}', ${item[1].dontAppendStylesToHead}, '${item[0]}')
      return __federation_import('\${__federation_expose_${item[0]}}').then(module =>Object.keys(module).every(item => exportSet.has(item)) ? () => module.default : () => module)},`;
  }
  return {
    name: "vite:expose-production",
    virtualFile: {
      [`__remoteEntryHelper__${options.filename}`]: `
      const currentImports = {}
      `
    },
    buildStart() {
      var _a;
      if ((_a = parsedOptions.prodExpose) == null ? void 0 : _a.length) {
        this.emitFile({
          // fileName: `${builderInfo.assetsDir ? builderInfo.assetsDir + '/' : ''}${options.filename}`,
          type: "chunk",
          id: `__remoteEntryHelper__${options.filename}`
          // preserveSignature: 'strict'
        });
      }
    },
    generateBundle(_options, bundle) {
      for (const file in bundle) {
        const chunk = bundle[file];
        console.log("chunk.facadeModuleId", chunk.facadeModuleId);
        if (chunk.facadeModuleId === `\0virtual:__remoteEntryHelper__${options.filename}`) {
          console.log("chunk-->", chunk);
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
      pluginList = [prodExposePlugin(options)];
    }
    let virtualFiles = {};
    pluginList.forEach((plugin) => {
      if (plugin.virtualFile) {
        virtualFiles = Object.assign(virtualFiles, plugin.virtualFile);
      }
    });
    virtualMod = virtual(virtualFiles);
    console.log("virtualFiles", virtualMod);
  }
  return {
    name: "vite:federation",
    options: (_options) => {
    },
    config: (config, env) => {
      options.mode = options.mode ?? env.mode;
      registerPlugins(options == null ? void 0 : options.mode, env.command);
    },
    configResolved(config) {
      for (const pluginHook of pluginList) {
      }
    },
    resolveId(...args) {
      const v = virtualMod.resolveId.call(this, ...args);
      console.log("resolveId======>", v);
      if (v) return v;
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
    }
  };
}
export {
  federation as default
};
