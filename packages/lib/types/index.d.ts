export default function federation(
  options: VitePluginFederationOptions
): Plugin;

export interface VitePluginFederationOptions {
  name?: string;

  // 当前模式
  mode?: string;

  // 共享组件
  shared?: Shared;

  // 暴露出去的组件
  exposes?: Exposes;

  // 远程地址
  remotes?: Remotes;
}

// ================= shared ======================
type Shared = (string | SharedObject)[] | SharedObject;

interface SharedObject {
  [index: string]: string | SharedConfig;
}

interface SharedConfig {
  import?: boolean;
}

// ================= exposes ======================
type Exposes = (string | ExposesObject)[] | ExposesObject;

interface ExposesObject {
  [index: string]: string | string[];
}

// ================= remotes ======================

type Remotes = (string | RemotesObject)[] | RemotesObject;

interface RemotesObject {
  [index: string]: string | string[];
}

export type ConfigTypeSet = any;
