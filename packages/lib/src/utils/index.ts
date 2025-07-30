/*
 * @Author: phil
 * @Date: 2025-07-17 20:48:42
 */
import { ConfigTypeSet, Exposes, Remotes, RemotesConfig, Shared, VitePluginFederationOptions } from 'types'
import { posix } from 'path'

export function parseOptions(
  options: Shared | Remotes | Exposes | undefined,
  normalizeSimple: (value: any, key: any) => ConfigTypeSet,
  normalizeOptions: (value: any, key: any) => ConfigTypeSet
): (string | ConfigTypeSet)[] {
  if (!options) return []
  const list: { [index: number]: string | ConfigTypeSet }[] = []

  const array = (items: (string | ConfigTypeSet)[]) => {
    for (const item of items) {
      if (typeof item === 'string') {
        list.push([item, normalizeOptions(item, item)])
      } else if (typeof item === 'object') {
      } else {
        throw new Error('Unexpected options format')
      }
    }
  }
  const object = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      // console.log('key', key, value)
      if (typeof value === 'string' || Array.isArray(value)) {
        list.push([key, normalizeSimple(value, key)])
      } else {
        list.push([key, normalizeOptions(value, key)])
      }
    }
  }

  if (Array.isArray(options)) {
    array(options)
  } else if (typeof options === 'object') {
    object(options)
  } else {
    throw new Error('Unexpected options format')
  }

  return list
}

// shared
export function parseSharedOptions(options: VitePluginFederationOptions): (string | ConfigTypeSet)[] {
  return parseOptions(
    options.shared || {},
    (item) => {
      return {}
    },
    (item) => {
      return {}
    }
  )
}

// remotes
export function parseRemoteOptions(options: VitePluginFederationOptions): (string | ConfigTypeSet)[] {
  return parseOptions(
    options.remotes || {},
    (item) => {
      return {
        external: Array.isArray(item) ? item : [item],
        shareScope: 'default',
        format: 'esm',
        from: 'vite',
        externalType: 'url'
      }
    },
    (item) => {
      return {}
    }
  )
}

// expose
export function parseExposeOptions(options: VitePluginFederationOptions): (string | ConfigTypeSet)[] {
  return parseOptions(
    options.exposes || {},
    (item) => {
      return {
        import: item,
        name: undefined,
        dontAppendStylesToHead: false
      }
    },
    (item) => {
      return {}
    }
  )
}

export function getModuleMarker(value: string, type?: string): string {
  // return type ? `__rf_${type}__${value}` : `__ref_placeholder__${value}`
  return `__rf_${type || 'placeholder'}__${value}`
}

export function normalizePath(id: string): string {
  // 将输入的路径字符串中的所有反斜杠(\)替换为正斜杠(/)，然后使用posix.normalize方法对路径进行标准化处理
  // 这样可以确保在不同操作系统(如Windows和Unix)之间保持路径格式的一致性
  return posix.normalize(id.replace(/\\/g, '/'))
}

export const NAME_CHAR_REG = new RegExp('[0-9a-zA-Z@_-]+')
const letterReg = new RegExp('[0-9a-zA-Z]+')

/**
 * 移除字符串中不符合正则表达式的字符，并将非匹配字符后的第一个匹配字符转为大写
 * @param str - 要处理的字符串
 * @param reg - 用于匹配字符的正则表达式，默认为letterReg
 * @returns 处理后的字符串
 */
// ./button => Button
export function removeNonRegLetter(str: string, reg = letterReg): string {
  // 初始化一个布尔变量，用于标记下一个字符是否需要转换为大写
  let needUpperCase = false
  // 初始化一个空字符串，用于存储处理后的结果
  let ret = ''
  // 遍历输入字符串中的每个字符
  for (const c of str) {
    // 检查当前字符是否匹配正则表达式
    if (reg.test(c)) {
      // 如果匹配，则根据needUpperCase标记决定是否将字符转为大写，然后添加到结果字符串中
      ret += needUpperCase ? c.toUpperCase() : c
      // 重置大写标记为false
      needUpperCase = false
    } else {
      // 如果不匹配，则设置大写标记为true，表示下一个匹配的字符需要转为大写
      needUpperCase = true
    }
  }
  // 返回处理后的结果字符串
  return ret
}

export function createRemotesMap(remotes: Remote[]): string {
  const createUrl = (remote: Remote) => {
    const external = remote.config.external[0]
    const externalType = remote.config.externalType
    if (externalType === 'promise') {
      return `()=>${external}`
    } else {
      return `'${external}'`
    }
  }
  return `const remotesMap = {
${remotes.map((remote) => `'${remote.id}':{url:${createUrl(remote)},format:'${remote.config.format}',from:'${remote.config.from}'}`).join(',\n  ')}
};`
}

export const REMOTE_FROM_PARAMETER = 'remoteFrom'
export type Remote = { id: string; regexp: RegExp; config: RemotesConfig }
