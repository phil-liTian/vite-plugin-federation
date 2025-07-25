/*
 * @Author: phil
 * @Date: 2025-07-16 17:26:40
 */
export default function federation(options: VitePluginFederationOptions): Plugin

export interface VitePluginFederationOptions {
  name?: string

  // 当前模式
  mode?: string

  // 共享组件
  shared?: Shared

  // 暴露出去的组件
  exposes?: Exposes

  // 远程地址
  remotes?: Remotes

  // 配置打包后的文件名，这个文件名会匹配到host配置remotes
  filename?: string
}

// ================= shared ======================
type Shared = (string | SharedObject)[] | SharedObject

interface SharedObject {
  [index: string]: string | SharedConfig
}

interface SharedConfig {
  import?: boolean
}

// ================= exposes ======================
type Exposes = (string | ExposesObject)[] | ExposesObject

interface ExposesObject {
  [index: string]: string | string[]
}

interface ExposesConfig {
  import: string
  name?: string
}

// ================= remotes ======================

type Remotes = (string | RemotesObject)[] | RemotesObject

interface RemotesObject {
  [index: string]: string | string[]
}

interface RemotesConfig {
  external: string

  externalType: 'url' | 'promise'

  shareScope?: string

  format?: 'esm' | 'systemjs' | 'var'

  from?: 'vite' | 'webpack'
}

export type ConfigTypeSet = SharedConfig | RemotesConfig | ExposesConfig
