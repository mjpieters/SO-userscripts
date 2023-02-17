/* global Stacks */
import { useMutation } from 'stimulus-use'

export class EmptyDomController extends Stacks.StacksController {
  static controllerId = 'empty-dom'

  static targets = ['container']
  declare readonly hasContainerTarget: boolean
  declare readonly containerTarget: HTMLElement

  static classes = ['empty', 'notEmpty']
  declare readonly emptyClasses: string[]
  declare readonly notEmptyClasses: string[]

  static values = { scopeSelector: String }
  declare readonly hasScopeSelectorValue: boolean
  declare readonly scopeSelectorValue: string

  get container() {
    return this.hasContainerTarget ? this.containerTarget : this.element
  }

  get children(): Element[] {
    return Array.from(
      this.hasScopeSelectorValue
        ? this.container.querySelectorAll(this.scopeSelectorValue)
        : this.container.children
    )
  }

  connect() {
    useMutation(this, { childList: true, element: this.container })
    this.checkEmpty()
  }

  mutate() {
    this.checkEmpty()
  }

  checkEmpty() {
    const count = this.children.length
    if (count === 0) {
      this.element.classList.remove(...this.notEmptyClasses)
      this.element.classList.add(...this.emptyClasses)
      this.dispatch('empty', { target: this.container })
    } else {
      this.element.classList.add(...this.notEmptyClasses)
      this.element.classList.remove(...this.emptyClasses)
      this.dispatch('not-empty', {
        target: this.container,
        detail: { count },
      })
    }
  }
}
