"use strict";
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
      console.log("key", key, value);
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
      console.log("exposes-->", item);
      return {
        import: item
      };
    },
    (item) => {
      return {};
    }
  );
}
function devSharedPlugin(options) {
  parseSharedOptions(options);
  return {
    name: "vite:shared-development"
  };
}
function devExposePlugin(options) {
  parseExposeOptions(options);
  return {
    name: "vite:expose-development"
  };
}
function devRemotePlugin(options) {
  parseRemoteOptions(options);
  return {
    name: "vite:remote-development"
  };
}
function federation(options) {
  let pluginList = [];
  function registerPlugins(mode, command) {
    if (mode === "development" || command === "serve") {
      pluginList = [devSharedPlugin(options), devExposePlugin(options), devRemotePlugin(options)];
    }
  }
  return {
    name: "vite:federation",
    options: (_options) => {
      console.log("_options----", _options);
    },
    config: (config, env) => {
      options.mode = options.mode ?? env.mode;
      registerPlugins(options == null ? void 0 : options.mode, env.command);
    },
    configResolved(config) {
      var _a;
      console.log("ResolvedConfig", pluginList);
      for (const pluginHook of pluginList) {
        console.log("pluginHook.configResolved", pluginHook);
        (_a = pluginHook.configResolved) == null ? void 0 : _a.call(this, config);
      }
    },
    resolveId(...args) {
      console.log("args", args);
    },
    load(...args) {
      console.log("args", args);
    }
  };
}
module.exports = federation;
