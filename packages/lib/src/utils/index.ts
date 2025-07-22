/*
 * @Author: phil
 * @Date: 2025-07-17 20:48:42
 */
import { ConfigTypeSet, Exposes, Remotes, Shared, VitePluginFederationOptions } from 'types'

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
      console.log('key', key, value)
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
      console.log('item-->', item)

      return {}
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
      console.log('exposes-->', item)
      return {
        import: item
      }
    },
    (item) => {
      return {}
    }
  )
}
