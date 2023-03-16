/* eslint-env node */
import * as path from 'path'
import * as glob from 'glob'
import { execSync } from 'child_process'
import { existsSync } from 'fs'

import { BannerPlugin, Configuration } from 'webpack'
import { UserscriptPlugin } from 'webpack-userscript'

import { homepage } from './package.json'

const HERE = path.resolve(__dirname)
const SCRIPTS_FOLDER = path.resolve(HERE, 'scripts')
const OUTPUT = path.resolve(HERE, 'dist')
const DEV_SERVER_PORT = parseInt(process.env.DEV_SERVER_PORT || '8842')

const VERSION =
  process.env.VERSION ||
  process.env.npm_package_version ||
  execSync('git describe --tags --abbrev=0 || echo "1.0.0"')
    .toString()
    .trim()
    .replace(/^v/, '')

const scriptMainPaths = glob.globIterateSync(
  path.join(SCRIPTS_FOLDER, '*/src/index.ts')
)
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
  const downloadUrl = isDevMode
    ? `http://localhost:${DEV_SERVER_PORT}`
    : `${homepage}/raw/main/dist/`
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
      // Can't use [name].user.js, see momocow/webpack-userscript#90
      filename: '[name].js',
    },
    plugins: [
      ...(isDevMode
        ? [
            new BannerPlugin({
              raw: true,
              banner: (data) =>
                `console.log(\`Start userscript: "${
                  data.chunk.name
                }". Build time: \${new Date(${Date.now()}).toLocaleString()}\`);`,
            }),
          ]
        : []),
      new UserscriptPlugin({
        metajs: true,
        downloadBaseURL: downloadUrl,
        strict: !isDevMode,
        headers: (original, ctx) => {
          const name = ctx.fileInfo.basename
          const headersFile = path.resolve(SCRIPTS_FOLDER, name, 'headers.json')
          return {
            ...original,
            name: ctx.fileInfo.basename,
            namespace: original.homepage,
            homepage: `${original.homepage}/tree/main/scripts/${name}`,
            supportURL: `${original.supportURL}?q=is:issue+is%3Aopen+label:${name}`,
            version: isDevMode ? `${VERSION}-build.[buildNo]` : VERSION,
            ...(existsSync(headersFile) && require(headersFile)),
          }
        },
        proxyScript: isDevMode
          ? {
              baseURL: `http://localhost:${DEV_SERVER_PORT}/`,
              filename: '[basename].proxy.user.js',
            }
          : undefined,
      }),
    ].filter(Boolean),
    devtool: false,
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
