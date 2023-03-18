import config from '../webpack.config'
import { homepage } from '../package.json'
import { UserScripts } from '../utils'

import { beforeAll, describe, expect, test } from '@jest/globals'
import { createFsFromVolume } from 'memfs'
import { Volume } from 'memfs/lib/volume'
import path from 'path'
import webpack from 'webpack'

type WebpackResult = Pick<webpack.Compilation, 'assets'> & { output: Volume }

async function runWebpack(): Promise<WebpackResult> {
  const volume = new Volume()
  const compiler = webpack(config({}, {}))
  compiler.outputFileSystem = createFsFromVolume(volume)
  return await new Promise<WebpackResult>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) return reject(err)
      if (!stats) return reject(new Error('No stats returned from webpack'))
      resolve({ assets: stats.compilation.assets, output: volume })
    })
  })
}

describe('The webpack build is not broken', () => {
  const scripts = new UserScripts()
  let sources: Record<string, string>
  let assetNames: string[] = []

  beforeAll(async () => {
    const { assets, output } = await runWebpack()
    const files = output.toJSON()
    sources = Object.fromEntries(
      Object.entries(files).map(([filename, source]) => [
        path.basename(filename),
        source || '',
      ])
    )
    assetNames = Object.keys(assets)
  })

  test.each(scripts.names)('output includes a %p.meta.js file', (name) => {
    expect(assetNames).toContain(`${name}.meta.js`)
  })

  test.each(scripts.names)('output includes a %p.user.js file', (name) => {
    expect(assetNames).toContain(`${name}.user.js`)
  })

  test.each(scripts.names)(
    '%p.meta.js updateURL links to the correct meta.js URL',
    (name) => {
      const meta = sources[`${name}.meta.js`]
      expect(meta).toMatch(
        new RegExp(`// @updateURL\\s*${homepage}/raw/main/dist/${name}.meta.js`)
      )
    }
  )

  test.each(scripts.names)(
    '%p.meta.js downloadURL links to the correct user.js URL',
    (name) => {
      const meta = sources[`${name}.meta.js`]
      expect(meta).toMatch(
        new RegExp(
          `// @downloadURL\\s*${homepage}/raw/main/dist/${name}.user.js`
        )
      )
    }
  )
})
