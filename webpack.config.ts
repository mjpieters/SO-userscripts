/* eslint-env node */
import type { Configuration } from 'webpack'
import { BannerPlugin } from 'webpack'
import * as path from 'path'
import * as glob from 'glob'
import WebpackUserscript from 'webpack-userscript'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

const HERE = path.resolve(__dirname)
const SCRIPTS_FOLDER = path.resolve(HERE, 'scripts')
const OUTPUT = path.resolve(HERE, 'dist')
const DEV_SERVER_PORT = 8842

const HEADER_DEFAULTS = {
  namespace: '[homepage]',
  version:
    process.env.VERSION || process.env.npm_package_version || '[version]',
}
const gitCommitHash = execSync('git rev-parse HEAD').toString().trim()

const scriptMainPaths = glob.sync(path.join(SCRIPTS_FOLDER, '*/src/index.ts'))
const entries: { [key: string]: string } = {}
for (const mainPath of scriptMainPaths) {
  const scriptName = path.basename(path.dirname(path.dirname(mainPath)))
  entries[scriptName] = mainPath
}

const config: (
  env: Record<string, any>,
  args: Record<string, any>
) => Configuration = (_, argv) => {
  const isDevMode = argv.mode === 'development'
  return {
    entry: entries,
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'ts-loader',
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.ts'],
    },
    output: {
      clean: true,
      path: OUTPUT,
      filename: '[name].user.js',
    },
    plugins: [
      isDevMode
        ? new BannerPlugin({
            raw: true,
            banner: (data) =>
              `console.log(\`Start userscript: "${
                data.chunk.name
              }". Build time: \${new Date(${Date.now()}).toLocaleString()}\`);`,
          })
        : undefined,
      new WebpackUserscript({
        metajs: false,
        headers: (data) => {
          const headersFile = path.resolve(
            SCRIPTS_FOLDER,
            data.basename,
            'headers.json'
          )
          const baseUrl = isDevMode
            ? `http://localhost:${DEV_SERVER_PORT}/`
            : `${data.homepage}/raw/${gitCommitHash}/dist`
          const downloadURL = isDevMode
            ? `${baseUrl}${data.basename}.proxy.user.js`
            : `${baseUrl}${data.basename}.user.js`
          const headers = {
            ...HEADER_DEFAULTS,
            downloadURL,
            updateURL: downloadURL.replace(`/${gitCommitHash}/`, '/main/'),
            ...(existsSync(headersFile) && require(headersFile)),
          }
          if (isDevMode) {
            headers.version = `${headers.version || '[version]'}-t.[buildTime]`
          }
          return headers
        },
        proxyScript: {
          baseUrl: `http://localhost:${DEV_SERVER_PORT}/`,
          enable: isDevMode,
          filename: '[basename].proxy.user.js',
        },
      }),
    ].filter(Boolean),
    devtool: 'inline-source-map',
    devServer: {
      static: {
        directory: OUTPUT,
        serveIndex: true,
      },
      port: DEV_SERVER_PORT,
      hot: false,
      liveReload: false,
    },
  }
}

export default config
