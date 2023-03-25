import { beforeAll, describe, expect, test } from '@jest/globals'

import { persisted } from '@connected-users/storage'

const STORAGE_KEY = 'testStorageKey'
const loadStorage = async (delay = 300) => {
  // allow time for debounces to complete
  await new Promise((resolve) => setTimeout(resolve, delay))
  return JSON.parse(localStorage[STORAGE_KEY])
}
const saveStorage = (data: any) => {
  localStorage[STORAGE_KEY] = JSON.stringify(data)
}

beforeAll(() => {
  localStorage.clear()
})

describe('We can load browser storage', () => {
  const preferenceDefaults = {
    foo: 'spam',
    nested: { bar: 'eggs' },
  }

  test('from default values', () => {
    const [preferences, _reload] = persisted(STORAGE_KEY, preferenceDefaults)
    expect(preferences).toMatchObject(preferenceDefaults)
  })

  describe('from existing values', () => {
    const expected = {
      foo: 'ham',
      nested: { bar: 'eggs' },
    }
    beforeAll(() => {
      localStorage[STORAGE_KEY] = JSON.stringify(expected)
    })

    test('which are not equal to the defaults', () => {
      const [preferences, _reload] = persisted(STORAGE_KEY, preferenceDefaults)
      expect(preferences).not.toMatchObject(preferenceDefaults)
    })

    test('are equal to the stored data', () => {
      const [preferences, _reload] = persisted(STORAGE_KEY, preferenceDefaults)
      expect(preferences).toMatchObject(expected)
    })
  })

  describe('changes are persisted', () => {
    test('for top-level properties', async () => {
      const [preferences, _reload] = persisted(STORAGE_KEY, preferenceDefaults)
      preferences.foo = 'ham'

      const stored = await loadStorage()
      expect(stored.foo).toBe('ham')
    })

    test('for nested properties', async () => {
      const [preferences, _reload] = persisted(STORAGE_KEY, preferenceDefaults)
      preferences.nested.bar = 'eggs'

      const stored = await loadStorage()
      expect(stored.nested.bar).toBe('eggs')
    })

    test('multiple updates', async () => {
      const [preferences, _reload] = persisted(STORAGE_KEY, preferenceDefaults)
      preferences.foo = 'ham'
      preferences.foo = 'spam'
      preferences.nested.bar = 'eggs'

      const stored = await loadStorage()
      expect(stored).toMatchObject({ foo: 'spam', nested: { bar: 'eggs' } })
    })
  })

  describe('storage can be reloaded', () => {
    test('no changes were made', () => {
      const [preferences, reload] = persisted(STORAGE_KEY, preferenceDefaults)

      expect(preferences).toMatchObject(preferenceDefaults)
      reload()
      expect(preferences).toMatchObject(preferenceDefaults)
    })

    test('Changes are only visible after a reload', () => {
      const [preferences, reload] = persisted(STORAGE_KEY, preferenceDefaults)

      const expected = {
        foo: 'ham',
        nested: { bar: 'eggs' },
      }
      saveStorage(expected)

      expect(preferences).toMatchObject(preferenceDefaults)
      reload()
      expect(preferences).toMatchObject(expected)
    })
  })
})
