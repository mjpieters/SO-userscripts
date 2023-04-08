/* global Stacks, luxon */

import { IconEyeSm, IconEyeOffSm } from '@stackoverflow/stacks-icons/icons'

import { controllerId } from '../constants'
import { preferences } from '../preferences'
import { camelize } from '../utils'
import { UserFrequencies } from './types'

import { parseAccessInterval } from './utils'

const mainUserCls = 's-mainUser'
const knownUserCls = 's-known'
const overlapCls = 's-overlap'

const ipGroupStyles = `
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${mainUserCls} {
    background: var(--green-300);
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${knownUserCls} {
    background: var(--gold-lighter);
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${mainUserCls}.${knownUserCls} {
    background: var(--green-100) !important;
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${overlapCls} {
    background: var(--orange-200);
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid] .s-btn {
    display: none;
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${knownUserCls}:hover .s-focus-rm-btn, 
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${knownUserCls}:focus .s-focus-rm-btn { 
    display: block;
    background-color: var(--_bu-bg-hover);
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid]:hover .s-focus-add-btn, 
  [data-controller="${controllerId}-ip-group"] tr[data-uid]:focus .s-focus-add-btn { 
    display: block;
    background-color: var(--_bu-bg-hover);
  }
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${knownUserCls}:hover .s-focus-add-btn, 
  [data-controller="${controllerId}-ip-group"] tr[data-uid].${knownUserCls}:focus .s-focus-add-btn { 
    display: none !important;
  }
`

const userControls = `
<span class="ps-absolute h0">
  <button class="s-btn s-btn__icon s-btn__xs s-focus-add-btn ps-relative l96 tn4"
          data-controller="s-tooltip"
          data-action="${controllerId}#addFocusUser"
          title="Add this user to the focused accounts list"
    >${IconEyeSm} <span class="md:d-none">Focus</span></button></span>
<span class="ps-absolute h0">
  <button class="s-btn s-btn__icon s-btn__xs s-btn__danger s-focus-rm-btn ps-relative l96 tn4"
          data-controller="s-tooltip"
          data-action="${controllerId}#removeFocusUser"
          title="Remove this user from the focused accounts list"
    >${IconEyeOffSm} <span class="md:d-none">Remove</span></button></span>
`

export class IpGroupController extends Stacks.StacksController {
  static controllerId = `${controllerId}-ip-group`

  static afterLoad(identifier: string, application: typeof Stacks.application) {
    application.logDebugActivity(identifier, 'afterLoad')
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style id="${identifier}-styles">${ipGroupStyles}</style>`
    )
  }

  private belowThreshold: Set<number>

  private get userRows(): HTMLTableRowElement[] {
    return Array.from(
      this.element.querySelectorAll<HTMLTableRowElement>('tbody > tr[data-uid]')
    )
  }

  private get mainUserRow(): HTMLTableRowElement {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.element.querySelector<HTMLTableRowElement>(
      `tbody .${mainUserCls}`
    )!
  }

  private get focusUserRows(): HTMLTableRowElement[] {
    const known = new Set<number>(preferences.focusedUsers)
    return this.userRows.filter((tr) =>
      known.has(parseInt(tr.dataset.uid || '0'))
    )
  }

  private get focusIntervals(): luxon.Interval[] {
    return [this.mainUserRow, ...this.focusUserRows].map((tr) =>
      parseAccessInterval(tr)
    )
  }

  private get connectedUserRows(): HTMLTableRowElement[] {
    const intervals = this.focusIntervals
    const known = new Set<number>(preferences.focusedUsers)
    return this.userRows.filter((tr) => {
      if (tr.classList.contains(mainUserCls)) return false
      const uid = parseInt(tr.dataset.uid || '0')
      if (known.has(uid)) return false
      const interval = parseAccessInterval(tr)
      return intervals.some((i) => i.overlaps(interval))
    })
  }

  get connectedUsers(): number[] {
    return this.connectedUserRows.map((tr) => parseInt(tr.dataset.uid || '0'))
  }

  private showOnlyConnected: boolean

  private updateMarkup() {
    // Make it easier to work with the table rows by adding some dataset values.
    this.element
      .querySelectorAll<HTMLTableRowElement>('tbody tr')
      .forEach((tr) => {
        const userLink = tr.querySelector<HTMLAnchorElement>('td a')
        tr.dataset.uid = userLink?.href.split('/').pop() || '0'
      })
    const mainUserId = location.pathname.split('/').pop() || '0'
    this.element
      .querySelector(`tr[data-uid="${mainUserId}"]`)
      ?.classList.add(mainUserCls)
  }

  connect() {
    this.updateMarkup()
    this.belowThreshold = new Set<number>()
    this.showOnlyConnected = preferences.xrefUIState.showOnlyConnected
    this.addFocusButtons()
    this.updateClasses()
  }

  private addFocusButtons() {
    this.userRows.forEach((tr) => {
      const uid = tr.dataset.uid || '0'
      const dataKey = `${camelize(controllerId)}UidParam`
      tr.querySelector('td a')?.insertAdjacentHTML('beforebegin', userControls)
      tr.querySelectorAll<HTMLButtonElement>('td .s-btn[data-action]').forEach(
        (btn) => (btn.dataset[dataKey] = uid)
      )
    })
  }

  private updateClasses() {
    this.userRows.forEach((tr) => {
      tr.classList.remove(knownUserCls, overlapCls, 'd-none')
      delete tr.dataset.connected
    })
    this.focusUserRows.forEach((tr) => {
      tr.classList.add(knownUserCls)
    })
    this.connectedUserRows.forEach((tr) => {
      const uid = parseInt(tr.dataset.uid || '0')
      tr.classList.toggle(overlapCls, !this.belowThreshold.has(uid))
    })
    if (this.showOnlyConnected) {
      const kept = [mainUserCls, knownUserCls, overlapCls]
      this.userRows.forEach((tr) => {
        if (!kept.some((c) => tr.classList.contains(c)))
          tr.classList.add('d-none')
      })
    }
  }

  private refreshId: number | null = null

  refresh(showOnlyConnected?: boolean) {
    if (showOnlyConnected !== undefined)
      this.showOnlyConnected = showOnlyConnected
    if (this.refreshId !== null) return
    this.refreshId = window.requestAnimationFrame(() => {
      this.updateClasses()
      this.refreshId = null
    })
  }

  updateUsersBelowThreshold(threshold: number, connected: UserFrequencies) {
    this.belowThreshold = new Set<number>(
      connected.reduce(
        (uids, { uid, count }) => (count < threshold ? [...uids, uid] : uids),
        [] as number[]
      )
    )
    this.updateClasses()
  }
}
