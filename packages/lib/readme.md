### 使用

在 remote 应用中, 即提供共享组件的应用;添加如下配置, 执行 npm run build; 会在 dist 中生成 remoteEntry.js 和 Button 相关的 js 文件, 然后执行 npm run preview 则 host 可以通过 http://localhost:4173/assets/remoteEntry.js 访问到 js 内容

```js
// vite.config.ts
import federation from '@phil/vite-plugin-federation'
federation({
  name: 'remoteApp',
  filename: 'remoteEntry.js',
  exposes: {
    './Button': './src/components/Button'
  }
})
```

在 host 应用中,添加如下配置, 则可以在组件中通过`import { Button } from 'remoteApp/Button'`使用 host 提供的 Button 组件

```js
// vite.config.ts
federation({
  name: 'react-host',
  shared: ['react'],
  remotes: {
    remoteApp: 'http://localhost:4173/assets/remoteEntry.js'
  }
})
```

### 核心实现逻辑

<!-- 0730 理解 -->

#### remote 即 expose

1. 注册插件, 测试环境与生产环境插件分开处理, 由于 remote 应用必须通过打包生成 remoteEntry(可自定义文件名) 文件, 所以 expose 的插件需要在生产环境中处理（remoteEntry 就是抛出了一系列的方法）

2. 在初始化时, expose 定义一个 virtualFile, 在 build 时会执行 resolveId 和 load(这里会解析到 virtualFile 的内容); 然后在 buildStart hook 中使用 this.emitFile 在 dist 文件生成一个文件.

```js
if (parsedOptions.prodExpose?.length) {
  this.emitFile({
    fileName: `${builderInfo.assetsDir ? builderInfo.assetsDir + '/' : ''}${options.filename}`,
    type: 'chunk',
    id: `__remoteEntryHelper__${options.filename}`,
    preserveSignature: 'strict'
  })
}
```

3. 如何有 expose 的话，在 remote-production 中会生成一个与 expose 抛出组件相关的 js 文件

```js
this.emitFile({
  type: 'chunk',
  id: expose[1].id ?? expose[1].import,
  name: EXPOSES_KEY_MAP.get(expose[0]),
  preserveSignature: 'allow-extension'
})
```

4. 在 generateBundle 中处理 remoteEntryChunk; 如果 expose 抛出的 js 与 chunk 的 name 相同, 则替换`\${__federation_expose_${expose[0]}}`为导入组件的相对位置.

```js
if (module) {
  // console.log('module', module)
  const chunk = bundle[module]
  // console.log('chunk', chunk)
  const fileRelativePath = relative(dirname(remoteEntryChunk.fileName), chunk.fileName)

  const slashPath = fileRelativePath.replace(/\\/g, '/')

  remoteEntryChunk.code = remoteEntryChunk.code.replace(`\${__federation_expose_${expose[0]}}`, `./${slashPath}`)
}
```

5. 处理 remoteEntry ast, 是函数调用而且包含 DYNAMIC_LOADING_CSS_PREFIX, 则移除掉

```js
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
const magicString = new MagicString(remoteEntryChunk.code)
if (!ast) return

walk(ast, {
  enter(node: any) {
    if (node && node.type === 'CallExpression' && typeof node.arguments[0]?.value === 'string' && node.arguments[0]?.value.indexOf(`${DYNAMIC_LOADING_CSS_PREFIX}`) > -1) {
      magicString.remove(node.start, node.end + 1)
    }
  }
})
```

#### host

1.  使用 transform hook 解析代码。`import { Button } from 'remoteApp/Button'`; 如果`const moduleId = node.source.value
const remote = devRemotes.find((r) => r.regexp.test(moduleId))` 匹配到 import 的内容匹配到 remotes 中定义的 devRemotes,则说明当前组件需要远程导入 remote 提供的组件。则需要将 remoteApp/Button 转换成远程导入的形式

```js
if (!hasStaticImported.has(moduleId)) {
  magicString.overwrite(node.start, node.end, `const ${afterImportName} = await __federation_method_getRemote(${JSON.stringify(remote.id)} , ${JSON.stringify(modName)});`)
  hasStaticImported.set(moduleId, afterImportName)
}
```

2. 分别处理在 host 项目中的 import 方式: 默认导入和具名导入

```js
let deconstructStr = ''

node.specifiers.forEach((spec) => {
  if (spec.type === 'ImportDefaultSpecifier') {
    magicString.appendRight(node.end, `\n let ${spec.local.name} = __federation_method_unwrapDefault(${afterImportName}) `)
  } else if (spec.type === 'ImportSpecifier') {
    const importedName = spec.imported.name
    const localName = spec.local.name
    deconstructStr += `${localName === importedName ? localName : `${importedName}: ${localName}`}`
  }
})

if (deconstructStr?.length) {
  magicString.appendRight(node.end, `\n let { ${deconstructStr} } = ${afterImportName}`)
}
```
