import { defineConfig } from 'tsdown'

const packageName = '@lizhecome/dsh-prompt-optimizer'

export default defineConfig({
  name: `${packageName}/client`,
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  clean: false,
  sourcemap: false,
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/cordis'],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => {`,
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
})
