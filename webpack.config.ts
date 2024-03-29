/* eslint-env node */
import * as path from 'path'

import { Configuration } from 'webpack'
import { UserscriptPlugin } from 'webpack-userscript'

import { homepage } from './package.json'
import { currentTag, UserScripts } from './utils'

const HERE = path.resolve(__dirname)
const OUTPUT = path.resolve(HERE, 'dist')
const DEV_SERVER_PORT = parseInt(process.env.DEV_SERVER_PORT ?? '8842')
const VERSION = process.env.VERSION ?? currentTag().replace(/^v/, '')

const config: (
  env: Record<string, unknown>,
  args: Record<string, unknown>
) => Configuration = (_, argv) => {
  const isDevMode = argv.mode === 'development'
  /* istanbul ignore next */
  const downloadUrl = isDevMode
    ? `http://localhost:${DEV_SERVER_PORT}`
    : `${homepage}/releases/latest/download/`
  /* istanbul ignore next */
  const proxyScript = isDevMode
    ? {
        baseURL: `http://localhost:${DEV_SERVER_PORT}/`,
        filename: '[basename].proxy.user.js',
      }
    : undefined

  const scripts = new UserScripts()

  const plugin = new UserscriptPlugin({
    metajs: true,
    pretty: true,
    downloadBaseURL: downloadUrl,
    strict: !isDevMode,
    proxyScript,
    headers: (original, ctx) => {
      const name = ctx.fileInfo.basename
      const { homepage, supportURL } = original
      return {
        ...original,
        name,
        namespace: homepage,
        homepage: `${homepage}/tree/main/scripts/${name}`,
        supportURL: `${supportURL}?q=is:issue+is%3Aopen+label:${name}`,
        version: isDevMode ? `${VERSION}-build.[buildNo]` : VERSION,
        ...scripts.headers[name],
      }
    },
  })

  return {
    entry: scripts.entries,
    module: { rules: [{ test: /\.ts$/, loader: 'swc-loader' }] },
    resolve: { extensions: ['.js', '.ts'] },
    output: {
      clean: true,
      path: OUTPUT,
      filename: '[name].user.js',
    },
    plugins: [plugin],
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
