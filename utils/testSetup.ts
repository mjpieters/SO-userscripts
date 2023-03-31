import * as Stimulus from '@hotwired/stimulus'

Object.defineProperties(global, {
  StackExchange: {
    value: {
      options: { user: { isModerator: false } },
      ready: (cb: () => void) => cb(),
    },
    configurable: true,
  },
  Stacks: {
    value: {
      StacksController: class StacksController extends Stimulus.Controller {},
    },
    configurable: true,
  },
})
