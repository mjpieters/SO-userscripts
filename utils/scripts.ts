import path from 'path'
import glob from 'glob'

interface UserScriptContexts {
  [scriptName: string]: Record<string, any>
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
      const entries: { [key: string]: string } = {}
      for (const mainPath of scriptMainPaths) {
        const scriptName = path.basename(path.dirname(path.dirname(mainPath)))
        entries[scriptName] = mainPath
      }
      this._entries = entries
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
}

export { UserScripts }
