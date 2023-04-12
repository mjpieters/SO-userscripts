import path from 'path'
import { globIterateSync } from 'glob'
import { existsSync } from 'fs'

interface UserScriptContexts {
  [scriptName: string]: Record<string, any>
}
type UserScriptTest = {
  name: string
  path: string
}

class UserScripts {
  private scriptsFolder: string

  constructor() {
    this.scriptsFolder = path.resolve(__dirname, '..', 'scripts')
  }

  get names(): string[] {
    return Object.keys(this.entries)
  }

  private entries_cache: { [key: string]: string } | undefined

  get entries(): { [key: string]: string } {
    if (this.entries_cache === undefined) {
      const scriptMainPaths = globIterateSync(
        path.join(this.scriptsFolder, '*/src/index.ts')
      )
      this.entries_cache = {}
      for (const mainPath of scriptMainPaths) {
        const scriptName = path.basename(path.dirname(path.dirname(mainPath)))
        this.entries_cache[scriptName] = mainPath
      }
    }
    return this.entries_cache
  }

  private headers_cache: UserScriptContexts

  get headers(): UserScriptContexts {
    if (this.headers_cache === undefined) {
      this.headers_cache = {}
      for (const scriptName of Object.keys(this.entries)) {
        Object.defineProperty(this.headers_cache, scriptName, {
          get: () => this.headersFor(scriptName),
        })
      }
    }
    return this.headers_cache
  }

  private headersFor(scriptName: string): Record<string, any> {
    const headersFile = path.resolve(
      this.scriptsFolder,
      scriptName,
      'headers.json'
    )
    try {
      return require(headersFile)
    } catch (e) {
      return {}
    }
  }

  private tests_cache: UserScriptTest[]

  get tests(): UserScriptTest[] {
    if (this.tests_cache === undefined) {
      this.tests_cache = this.names.reduce((tests, scriptName) => {
        const scriptPath = path.resolve(this.scriptsFolder, scriptName)
        if (existsSync(path.resolve(scriptPath, 'test')))
          tests = [...tests, { name: scriptName, path: scriptPath }]
        return tests
      }, [] as UserScriptTest[])
    }
    return this.tests_cache
  }
}

export { UserScripts }
