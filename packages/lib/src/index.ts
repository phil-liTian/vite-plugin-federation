import type { ConfigEnv, ResolvedConfig, UserConfig } from "vite";
import { VitePluginFederationOptions } from "../types/index";
import { PluginHooks } from "../types/pluginHooks";
import { devSharedPlugin } from "./dev/shared-development";

function federation(options: VitePluginFederationOptions) {
  let pluginList: PluginHooks[] = [];
  function registerPlugins(mode: string, command: string) {
    console.log("mode", mode, command);
    if (mode === "development" || command === "serve") {
      // TODO: 测试
      pluginList = [devSharedPlugin(options)];
    } else if (mode === "production" || command === "build") {
      // TODO: 生产
    }
  }

  return {
    name: "vite:federation",
    options: (_options) => {
      console.log("_options", _options);
    },
    config: (config: UserConfig, env: ConfigEnv) => {
      // console.log("config", config, env);
      options.mode = options.mode ?? env.mode;
      registerPlugins(options?.mode, env.command);
    },
    configResolved: (config: ResolvedConfig) => {
      // console.log("ResolvedConfig", config);
    },
  };
}

export default federation;
