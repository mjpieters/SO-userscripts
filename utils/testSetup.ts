Object.defineProperty(global, 'StackExchange', {
  value: {
    options: { user: { isModerator: false } },
    ready: (cb: () => void) => cb(),
  },
  configurable: true,
})
