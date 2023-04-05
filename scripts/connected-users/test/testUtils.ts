type CP<T extends unknown[]> = T extends []
  ? []
  : { [i in keyof T]: T[i] extends (infer S)[] ? S : never }[]
/** Produce the cartesian product of the values of the input arrays */
export const cartesian = <T extends unknown[][]>(inputs: [...T]) => {
  const result = [] as CP<T>
  if (!inputs.length) return result
  const indexes = inputs.map(() => 0)
  while (true) {
    result.push(indexes.map((i, idx) => inputs[idx][i]))
    let j = indexes.length - 1
    while (true) {
      if (indexes[j] < inputs[j].length - 1) {
        indexes[j] += 1
        break
      }
      indexes[j] = 0
      j -= 1
      if (j < 0) return result
    }
  }
}

export const domReady = () =>
  new Promise<void>((resolve) => {
    if (document.readyState !== 'loading') return resolve()
    document.addEventListener('DOMContentLoaded', () => resolve())
  })
