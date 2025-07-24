/*
 * @Author: phil
 * @Date: 2025-07-17 19:56:32
 */
import { ConfigTypeSet } from 'types'

export const SHARED = 'shared'
export const EXTERNALS: string[] = []
export const EXPOSES_MAP = new Map()
export const EXPOSES_KEY_MAP = new Map()
export const DYNAMIC_LOADING_CSS = 'dynamicLoadingCss'
export const DYNAMIC_LOADING_CSS_PREFIX = '__v__css__'

export const builderInfo = {
  builder: 'rollup',
  assetsDir: '',
  isHost: false,
  isRemote: false,
  isShared: false
}

export const parsedOptions = {
  // dev
  devShared: [] as (string | ConfigTypeSet)[],
  devExpose: [] as (string | ConfigTypeSet)[],
  devRemote: [] as (string | ConfigTypeSet)[],

  // production
  prodShared: [] as (string | ConfigTypeSet)[],
  prodExpose: [] as (string | ConfigTypeSet)[],
  prodRemote: [] as (string | ConfigTypeSet)[]
}
