/* global Stacks */
import { controllerId } from '../constants'

import { UserFetcher } from './api'

// set padding inside the user cards to 0 in the usercard lists
// _uc-p is the CSS variable set by Stacks and we can override it here.
const userStyles = `.s-${controllerId} .s-user-card { --_uc-p: 0 }`
const api = UserFetcher.withDefaultClasses({ missingAssumeDeleted: true })

export class UserListController extends Stacks.StacksController {
  static controllerId = `${controllerId}-user-list`

  static targets = ['count', 'userRow']
  declare readonly countTarget: HTMLElement
  declare readonly userRowTargets: HTMLElement[]

  static classes = ['userCard']
  declare readonly userCardClasses: string

  static values = { keepFirst: { type: Boolean, default: false } }
  declare readonly keepFirstValue: boolean

  static afterLoad(identifier: string): void {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style id="${identifier}-styles">${userStyles}</style>`
    )
  }

  connect(): void {
    this.updateUsers()
  }

  private refreshId: number | null = null

  private async _update(): Promise<void> {
    this.countTarget.innerHTML = this.userRowTargets.length.toString()
    // replace sparse user cards with full versions
    // preserves the first child of an existing s-user-card div if keepFirst
    // is true
    const hydrationRows = new Map(
      this.userRowTargets.reduce(
        (entries, row) =>
          row.dataset.hydrated === 'true'
            ? entries
            : [...entries, [parseInt(row.dataset.uid ?? '0'), row]],
        [] as [number, HTMLDivElement][]
      )
    )
    try {
      if (hydrationRows.size === 0) return
      for await (const user of api.users([...hydrationRows.keys()])) {
        const userRow = hydrationRows.get(user.user_id)
        if (!userRow) continue
        const firstChild = this.keepFirstValue
          ? userRow.querySelector<HTMLDivElement>('.s-user-card :first-child')
          : null
        const existingCard =
          userRow.querySelector<HTMLDivElement>('.s-user-card')
        if (existingCard) existingCard.replaceWith(user.node)
        else userRow.replaceChildren(user.node)
        const newCard = userRow.querySelector('.s-user-card')
        newCard?.classList.add(...this.userCardClasses)
        if (firstChild) newCard?.insertAdjacentElement('afterbegin', firstChild)
        userRow.dataset.hydrated = 'true'
      }
      // signal the Mod User Quicklinks Everywhere script
      this.dispatch('moduserquicklinks', { prefix: '' })
      this.dispatch('usersHydrated', {
        detail: this.userRowTargets.reduce(
          (uids, r) =>
            r.querySelector('s-user-card__deleted') === null
              ? [...uids, parseInt(r.dataset.uid ?? '0')]
              : uids,
          [] as number[]
        ),
      })
    } finally {
      this.refreshId = null
    }
  }

  updateUsers(): void {
    if (this.refreshId !== null) window.cancelAnimationFrame(this.refreshId)
    this.refreshId = window.requestAnimationFrame(() => {
      // eslint-disable-next-line no-void
      void this._update()
    })
  }
}
