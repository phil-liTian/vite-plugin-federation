import path from 'node:path'
import os from 'node:os'
import fs from 'fs-extra'
import { chromium } from 'playwright-chromium'
import type { BrowserServer } from 'playwright-chromium'

let browserServer: BrowserServer | undefined

const DIR = path.join(os.tmpdir(), 'vitest_playwright_global_setup')
console.log('DIR', DIR);

export async function setup() {
  console.log('setup'); // 输出'setup'字符串到控制台，表示设置函数开始执行
  browserServer = await chromium.launchServer({
    headless: !process.env.VITE_DEBUG_SERVE, // 根据环境变量VITE_DEBUG_SERVE决定是否以无头模式启动浏览器，如果VITE_DEBUG_SERVE为true则不使用无头模式
    args: process.env.CI
      ? ['--no-sandbox', '--disable-setuid-sandbox'] // 在CI环境下，添加安全相关参数，禁用沙箱以适应CI环境
      : undefined // 非CI环境下不添加额外参数
  })

  await fs.mkdirp(DIR) // 创建DIR指定的目录，如果该目录不存在则递归创建
  await fs.writeFile(path.join(DIR, 'wsEndpoint'), browserServer.wsEndpoint()) // 将浏览器服务器的WebSocket端点URL写入到DIR目录下的wsEndpoint文件中，用于后续连接
}