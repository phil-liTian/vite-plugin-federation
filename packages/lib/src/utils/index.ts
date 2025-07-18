/*
 * @Author: phil
 * @Date: 2025-07-17 20:48:42
 */
import { ConfigTypeSet, Shared, VitePluginFederationOptions } from "types";

export function parseOptions(options: Shared): (string | ConfigTypeSet)[] {
  console.log("options--->", options);

  return [];
}

export function parseSharedOptions(
  options: VitePluginFederationOptions
): (string | ConfigTypeSet)[] {
  return parseOptions(options.shared || {});
}
