// Wrapper to persist data in localStorage, given an object with default values

const isValid = (value: string | null): value is string =>
  ![null, undefined, ''].includes(value)

function getStorageItem<T>(key: string, defaults: T): T {
  const { [key]: value }: Storage = localStorage
  if (!isValid(value)) return defaults
  return JSON.parse(value)
}

const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

function reactiveProxy<T extends Record<any, any>>(
  val: T,
  setCallback: () => void
): T {
  if (!isObject(val)) {
    return val
  }

  return new Proxy(val, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      return isObject(res) ? reactiveProxy(res, setCallback) : res
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver)
      setCallback()
      return res
    },
  })
}

function debounce<F extends (this: any, ...args: any) => any>(
  fn: F,
  wait = 200
): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), wait)
  }
}

/**
 * Wrap an object to automatically load and save its fields from and to localStorage.
 * Returns the wrapped object and a function to reload all fields from
 * localStorage (e.g. when responding to the Window.storage event).
 */
export function persisted<T extends Record<any, any>>(
  key: string,
  defaults: T
): [T, () => void] {
  const context = {
    storage: getStorageItem<T>(key, defaults),
    persist: () => (localStorage[key] = JSON.stringify(context.storage)),
  }

  const reload = (): void => {
    const updated = getStorageItem<T>(key, context.storage)
    for (const key of Object.keys(context.storage)) {
      context.storage[key as keyof T] = updated[key]
    }
  }
  return [reactiveProxy(context.storage, debounce(context.persist)), reload]
}
