#!/usr/bin/env node
/**
 * add-rare-ui.mjs —— 从 Rare UI 仓库拉取组件（绕过被墙的 raw.githubusercontent.com）
 *
 * 背景：shadcn CLI 通过 raw.githubusercontent.com 拉取注册表，本环境该域不可达；
 * 本脚本改走 GitHub Contents API（api.github.com，可达）拉取 public/r/<name>.json，
 * 注册表内联了组件源码，直接写入项目对应目录。
 *
 * 用法：
 *   node scripts/add-rare-ui.mjs fluid-orb
 *   node scripts/add-rare-ui.mjs folder-component
 *
 * 说明：
 * - 组件清单见 https://www.rareui.com/components 或仓库 public/r/registry.json
 * - registryDependencies 里的 "utils" 已在本项目实现（src/lib/utils.ts 的 cn）
 * - 写入路径按 components.json 的 aliases.ui = "@/component/ui"
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'swamimalode07/rare-ui'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const name = process.argv[2]
if (!name) {
  console.error('用法: node scripts/add-rare-ui.mjs <component-name>')
  console.error('示例: node scripts/add-rare-ui.mjs fluid-orb')
  process.exit(1)
}

const res = await fetch(`https://api.github.com/repos/${REPO}/contents/public/r/${name}.json`, {
  headers: { Accept: 'application/vnd.github.raw' },
})
if (!res.ok) {
  console.error(`拉取注册表失败（HTTP ${res.status}）：public/r/${name}.json`)
  process.exit(1)
}

const registry = JSON.parse(await res.text())

if (registry.dependencies?.length) {
  console.log(`依赖提示：该组件需要 npm 依赖 -> ${registry.dependencies.join(', ')}`)
}
for (const dep of registry.registryDependencies ?? []) {
  if (dep !== 'utils') console.log(`registry 依赖：${dep}（如未安装请先执行本脚本安装）`)
}

for (const file of registry.files ?? []) {
  /* 注册表路径约定：components/ui/xxx.tsx → src/component/ui/xxx.tsx */
  const rel = file.path.replace(/^components\/ui\//, 'src/component/ui/')
  const target = join(ROOT, rel)
  mkdirSync(dirname(target), { recursive: true })
  /* 去掉 Next.js 的 'use client' 指令（Vite 下无意义） */
  const content = (file.content ?? '').replace(/^'use client'\n\n?/, '')
  writeFileSync(target, content)
  console.log(`已写入 ${rel}`)
}
console.log(`完成：${registry.title ?? name}`)
