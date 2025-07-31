import os from 'node:os'
import fs from 'fs-extra'
import { chromium } from 'playwright-chromium'
import type { Browser, Page } from 'playwright-chromium'
import { join } from 'node:path'
import { beforeAll } from 'vitest'
import type { File } from 'vitest'


export const browserLogs: string[] = []
export const browserErrors: string[] = []
export let browser: Browser = undefined!
export let page: Page = undefined!

console.log('os', os.tmpdir());
const DIR = join(os.tmpdir(), 'vitest_playwright_global_setup')
console.log('DIR', DIR);



beforeAll(async (s) => {
  process.env.NODE_ENV = 'production'

  const suite = s as File
  
  if ( !suite.filepath?.includes('example') ) {
    return
  }

  const wsEndpoint = fs.readFileSync(join(DIR, 'wsEndpoint'), 'utf-8')

  if ( !wsEndpoint ) {
    throw new Error('wsEndpoint not found')
  }
  
  browser = await chromium.connect(wsEndpoint)
  // console.log('browser', browser);
  page = await browser.newPage()

  
})