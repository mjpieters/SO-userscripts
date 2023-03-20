import path from 'path'
import glob from 'glob'
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

  private _entries: { [key: string]: string } | undefined

  get entries(): { [key: string]: string } {
    if (this._entries === undefined) {
      const scriptMainPaths = glob.globIterateSync(
        path.join(this.scriptsFolder, '*/src/index.ts')
      )
      this._entries = {}
      for (const mainPath of scriptMainPaths) {
        const scriptName = path.basename(path.dirname(path.dirname(mainPath)))
        this._entries[scriptName] = mainPath
      }
    }
    return this._entries
  }

  private _headers: UserScriptContexts

  get headers(): UserScriptContexts {
    if (this._headers === undefined) {
      this._headers = {}
      for (const scriptName of Object.keys(this.entries)) {
        Object.defineProperty(this._headers, scriptName, {
          get: () => this.headersFor(scriptName),
        })
      }
    }
    return this._headers
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

  private _tests: UserScriptTest[]
  get tests(): UserScriptTest[] {
    if (this._tests === undefined) {
      this._tests = this.names.reduce((tests, scriptName) => {
        const scriptPath = path.resolve(this.scriptsFolder, scriptName)
        if (existsSync(path.resolve(scriptPath, 'test')))
          tests = [...tests, { name: scriptName, path: scriptPath }]
        return tests
      }, [] as UserScriptTest[])
    }
    return this._tests
  }
}

export { UserScripts }
