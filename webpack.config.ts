/* eslint-env node */
import * as path from 'path'

import { BannerPlugin, Configuration } from 'webpack'
import { UserscriptPlugin } from 'webpack-userscript'

import { homepage } from './package.json'
import { currentTag, UserScripts } from './utils'

const HERE = path.resolve(__dirname)
const OUTPUT = path.resolve(HERE, 'dist')
const DEV_SERVER_PORT = parseInt(process.env.DEV_SERVER_PORT || '8842')
const VERSION = process.env.VERSION || currentTag().replace(/^v/, '')

const config: (
  env: Record<string, any>,
  args: Record<string, any>
) => Configuration = (_, argv) => {
  const isDevMode = argv.mode === 'development'
  const downloadUrl = isDevMode
    ? `http://localhost:${DEV_SERVER_PORT}`
    : `${homepage}/raw/main/dist/`

  const scripts = new UserScripts()

  const plugin = new UserscriptPlugin({
    metajs: true,
    pretty: true,
    downloadBaseURL: downloadUrl,
    strict: !isDevMode,
    headers: (original, ctx) => {
      const name = ctx.fileInfo.basename
      const { homepage, supportURL } = original
      return {
        ...original,
        name: name,
        namespace: homepage,
        homepage: `${homepage}/tree/main/scripts/${name}`,
        supportURL: `${supportURL}?q=is:issue+is%3Aopen+label:${name}`,
        version: isDevMode ? `${VERSION}-build.[buildNo]` : VERSION,
        ...scripts.headers[name],
      }
    },
  })
  const plugins: Configuration['plugins'] = [plugin]

  if (isDevMode) {
    plugin.options.proxyScript = {
      baseURL: `http://localhost:${DEV_SERVER_PORT}/`,
      filename: '[basename].proxy.user.js',
    }

    plugins.unshift(
      new BannerPlugin({
        raw: true,
        banner: (data) =>
          `console.log(\`Start userscript: "${
            data.chunk.name
          }". Build time: \${new Date(${Date.now()}).toLocaleString()}\`);`,
      })
    )
  }

  return {
    entry: scripts.entries,
    module: { rules: [{ test: /\.ts$/, loader: 'ts-loader' }] },
    resolve: { extensions: ['.js', '.ts'] },
    output: {
      clean: true,
      path: OUTPUT,
      // Can't use [name].user.js, see momocow/webpack-userscript#90
      filename: '[name].js',
    },
    plugins,
    devtool: false,
    devServer: {
      static: { directory: OUTPUT, serveIndex: true },
      port: DEV_SERVER_PORT,
      hot: false,
      liveReload: false,
    },
  }
}

export default config
