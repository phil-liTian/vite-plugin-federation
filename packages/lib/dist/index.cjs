"use strict";
function parseOptions(options) {
  console.log("options--->", options);
  return [];
}
function parseSharedOptions(options) {
  return parseOptions(options.shared || {});
}
function devSharedPlugin(options) {
  parseSharedOptions(options);
  return {
    name: "vite:shared-development"
  };
}
function federation(options) {
  function registerPlugins(mode, command) {
    console.log("mode", mode, command);
    if (mode === "development" || command === "serve") {
      [devSharedPlugin(options)];
    }
  }
  return {
    name: "vite:federation",
    options: (_options) => {
      console.log("_options", _options);
    },
    config: (config, env) => {
      options.mode = options.mode ?? env.mode;
      registerPlugins(options == null ? void 0 : options.mode, env.command);
    },
    configResolved: (config) => {
    }
  };
}
module.exports = federation;
