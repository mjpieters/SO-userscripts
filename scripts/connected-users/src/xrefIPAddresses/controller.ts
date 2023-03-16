/* global luxon, Stacks */

import {
  IconCheckmarkSm,
  IconEyeSm,
  IconEyeOffSm,
  IconReputationSm,
  IconShareSm,
  IconTrashSm,
} from '@stackoverflow/stacks-icons/icons'

import { controllerId } from '../constants'
import { EmptyDomController } from '../emptyDom'
import { preferences, reload as reloadPreferences } from '../preferences'
import { UserListController } from '../users'
import { outlet, outletConnected, outlets } from '../utils'

import { Bucket, HistogramController } from './histogram'
import { IpGroupController } from './ipGroup'
import { UserFrequencies } from './types'

// The Suspicious Voting helper script removes the odd/even classes, adds the ip-group
// class. We need to account for both.
const ipGroupSelector = 'tr.odd, tr.even, tr.ip-group'
const histogramSelector = `.s-${controllerId}__connected-histogram`

const xrefFocusUIStyles = `
.s-${controllerId} .s-btn__copy.is-copied .v-hidden {
  visibility: inherit !important;
}
`

// Container for the floating UI. It's inserted before the IP cross-ref table
// and given a stick position, with the inner container top offset and
// relative posititioning placing it above the left column at 50% opacity.
// - A separate hover style and touch control makes it 100% opaque.
// - To ensure it can be interacted with, it's given a nav-level z-index.
// - The ws/hs classes give it its width and height.
// - The d-grid (display: grid) class on the container is needed to avoid
//   an apparent bug with the sidebar-widget styling involving expandable headers,
//   which causes the empty sticky container to have visible height?
const xrefFocusUI = `
<div class="s-${controllerId} ps-sticky h0 t0 d-grid z-nav"
     data-action="storage@window->${controllerId}#reloadPreferences">
  <div id="${controllerId}" role="navigation" aria-label="Connected users"
       class="o50 h:o100 f:o100 ws3 s-sidebarwidget ps-relative t128 l16">

    <div data-controller="${EmptyDomController.controllerId}"
         data-${EmptyDomController.controllerId}-empty-class="d-none"
      >
      <h2 class="s-sidebarwidget--header s-sidebarwidget__small-bold-text
                s-sidebarwidget__expanding-control"
          aria-expanded="false"
          aria-controls="${controllerId}-connected-histogram"
          aria-label="toggle connected users histogram"
          data-controller="s-expandable-control"
          data-action="
            s-expandable-control:show->${controllerId}#sectionToggled
            s-expandable-control:hide->${controllerId}#sectionToggled
          "
          tabindex="0">
        <span>Connected users histogram</span>
      </h2>
      <div class="s-expandable s-${controllerId}__connected-histogram"
          data-controller="${HistogramController.controllerId}"
          data-action="${HistogramController.controllerId}:click->${controllerId}#showConnected"
          id="${controllerId}-connected-histogram"
        >
        <div class="s-expandable--content">
          <svg xmlns="http://www.w3.org/2000/svg"
              class="s-sidebarwidget--content w100 hs1"
              data-${HistogramController.controllerId}-target="svg"
              data-${EmptyDomController.controllerId}-target="container"
              ></svg>
        </div>
      </div>
    </div>

    <div data-controller="${EmptyDomController.controllerId} ${UserListController.controllerId}"
         data-${EmptyDomController.controllerId}-empty-class="d-none"
         data-action="${EmptyDomController.controllerId}:not-empty->${UserListController.controllerId}#updateUsers"
      >
      <h2 class="s-sidebarwidget--header s-sidebarwidget__small-bold-text
                s-sidebarwidget__expanding-control"
          aria-expanded="false"
          aria-controls="${controllerId}-connected"
          aria-label="toggle connected users"
          data-controller="s-expandable-control"
          data-action="
            s-expandable-control:show->${controllerId}#sectionToggled
            s-expandable-control:hide->${controllerId}#sectionToggled
          "
          tabindex="0">
        <div class="s-check-control s-sidebarwidget--action"
            data-action="click->${controllerId}#toggleOnly:stop"
            data-controller="s-tooltip"
            title="Hide all users not connected to the focus account(s)"
          >
          <label class="s-label s-label__sm" for="${controllerId}-toggle-only-connected">Only</label>
          <input class="s-checkbox" type="checkbox"
            id="${controllerId}-toggle-only-connected"
            />
        </div>
        <span data-${UserListController.controllerId}-target="count">0</span> Connected users
      </h2>
      <div class="s-expandable" id="${controllerId}-connected">
        <div class="s-expandable--content">
          <div class="s-sidebarwidget--content
                      s-sidebarwidget__items
                      overflow-y-auto
                      hmx2
                     "
               data-${EmptyDomController.controllerId}-target="container"
               data-${controllerId}-target="connectedUsers"
            >
          </div>
        </div>
      </div>
    </div>

    <div data-controller="${EmptyDomController.controllerId} ${UserListController.controllerId}"
         data-${EmptyDomController.controllerId}-empty-class="d-none"
         data-action="
             ${EmptyDomController.controllerId}:not-empty->${UserListController.controllerId}#updateUsers
             ${UserListController.controllerId}:usersHydrated->${controllerId}#updateFocusUsersGraphLink
             "
      >
      <h2 class="s-sidebarwidget--header s-sidebarwidget__small-bold-text
                s-sidebarwidget__expanding-control"
          aria-expanded="false"
          aria-controls="${controllerId}-focused"
          aria-label="toggle focused users"
          data-controller="s-expandable-control"
          data-action="
            s-expandable-control:show->${controllerId}#sectionToggled
            s-expandable-control:hide->${controllerId}#sectionToggled
          "
          tabindex="0">
        <button class="
              s-sidebarwidget--action
              s-btn s-btn__icon s-btn__danger s-btn__xs s-btn__link fc-danger
              "
            data-controller="s-tooltip"
            data-action="${controllerId}#clearFocusUsers:stop"
            title="Clear the list of focus accounts"
        >${IconTrashSm}<span class="v-visible-sr">Clear</button>
        <a class="
              s-sidebarwidget--action
              s-btn s-btn__icon s-btn__xs p0
              "
            data-controller="s-tooltip"
            data-${controllerId}-target="focusUsersGraphLink"
            data-action="${controllerId}#openFocusUsersGraph:stop"
            title="IP activity graph for focus accounts"
            target="_blank"
            href="/admin/user-activity"
        >${IconReputationSm}<span class="v-visible-sr">Clear</a>
        <button class="
              s-sidebarwidget--action
              s-btn s-btn__icon s-btn__xs s-btn__link
              s-btn__copy
              "
            data-controller="s-tooltip"
            data-action="${controllerId}#copyFocusUsers:stop"
            title="Copy the list of focus users to the clipboard"
        >${IconShareSm}<span
            class="fc-success bg-black-025 ps-absolute l0 v-hidden"
        >${IconCheckmarkSm}</span><span class="v-visible-sr">Copy</span></button>
        <span data-${UserListController.controllerId}-target="count">0</span> Focused users
      </h2>
      <div class="s-expandable" id="${controllerId}-focused">
        <div class="s-expandable--content">
          <div class="s-sidebarwidget--content
                      s-sidebarwidget__items
                      overflow-y-auto
                      hmx2
                     "
               data-${EmptyDomController.controllerId}-target="container"
               data-${controllerId}-target="focusedUsers"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`

function usDate(dt: luxon.DateTime): string {
  // **Not** an international date format
  return dt.toFormat('yyyy/MM/dd')
}

export class XRefConnectedUsersController extends Stacks.StacksController {
  static controllerId = controllerId

  // Stimulus target elements
  static targets = [
    'xrefsTable',
    'connectedUsers',
    'focusedUsers',
    'focusUsersGraphLink',
  ]
  declare readonly xrefsTableTarget: HTMLTableElement
  declare readonly connectedUsersTarget: HTMLDivElement
  declare readonly focusedUsersTarget: HTMLDivElement
  declare readonly focusUsersGraphLinkTarget: HTMLAnchorElement

  // Stimulus outlet controllers
  static outlets = [
    HistogramController.controllerId,
    IpGroupController.controllerId,
  ]

  private get _ipGroups(): IpGroupController[] {
    return this[outlets<this>(IpGroupController)] as IpGroupController[]
  }
  private get _histogram(): HistogramController {
    return this[outlet<this>(HistogramController)] as HistogramController
  }

  static attach(xRefsSelector: string): void {
    const xrefsTable = document.querySelector(xRefsSelector) as HTMLTableElement
    const groups = Array.from(
      xrefsTable.querySelectorAll<HTMLTableRowElement>(ipGroupSelector)
    ).filter((row) => row.querySelector('tbody') !== null)
    Stacks.application.logDebugActivity(this.controllerId, 'attach', {
      controllersToRegister: [
        this.controllerId,
        IpGroupController.controllerId,
      ],
      hasXrefsTable: !!xrefsTable,
      ipGroupsCount: groups.length,
    })

    // Register the IpGroupController first, as these need to exist for
    // them to be viable outlets for this controller.
    Stacks.application.register(
      IpGroupController.controllerId,
      IpGroupController
    )

    // The table becomes a target for this controller, which is defined
    // on the parent div of the table.
    xrefsTable.setAttribute(
      Stacks.application.schema.targetAttributeForScope(this.controllerId),
      'xrefsTable'
    )
    groups.forEach(
      (ipGroup) => (ipGroup.dataset.controller = IpGroupController.controllerId)
    )

    // Update the controller list for the parent div, and register the
    // histogram and ipgroup outlets.
    const parentDiv = xrefsTable.parentElement as HTMLDivElement
    const controllers = (parentDiv.dataset.controller ?? '').split(' ')
    controllers.push(this.controllerId)
    parentDiv.dataset.controller = controllers.join(' ').trim()
    parentDiv.setAttribute(
      Stacks.application.schema.outletAttributeForScope(
        this.controllerId,
        IpGroupController.controllerId
      ),
      ipGroupSelector
    )
    parentDiv.setAttribute(
      Stacks.application.schema.outletAttributeForScope(
        this.controllerId,
        HistogramController.controllerId
      ),
      histogramSelector
    )

    // Finally, let Stimulus know about the controller
    Stacks.application.register(this.controllerId, this)
  }

  static afterLoad(identifier: string, application: typeof Stacks.application) {
    const controllers = [
      HistogramController,
      EmptyDomController,
      UserListController,
    ]
    application.logDebugActivity(identifier, 'afterLoad', {
      controllersToRegister: controllers.map((c) => c.controllerId),
    })
    for (const controller of controllers) {
      application.register(controller.controllerId, controller)
    }

    document.head.insertAdjacentHTML(
      'beforeend',
      `<style id="${identifier}-styles">${xrefFocusUIStyles}</style>`
    )
  }

  private _threshold = 0

  private get _uiDiv(): HTMLDivElement {
    let uiDiv = this.element.querySelector<HTMLDivElement>(
      `.s-${this.identifier}`
    )
    if (uiDiv === null) {
      // create the UI DOM as a detached fragment so we can adjust some
      // state first.
      const fragment = document.createElement('div')
      fragment.insertAdjacentHTML('afterbegin', xrefFocusUI)
      const newDiv = fragment.firstElementChild as HTMLDivElement
      newDiv
        .querySelectorAll('[data-controller="s-expandable-control"]')
        .forEach((expandable) => {
          const name = expandable.getAttribute('aria-controls')
          if (name && preferences.xrefUIState.openedSections[name]) {
            expandable.setAttribute('aria-expanded', 'true')
            newDiv.querySelector(`#${name}`)?.classList.add('is-expanded')
          }
        })
      newDiv
        .querySelector<HTMLInputElement>(
          `#${controllerId}-toggle-only-connected`
        )
        ?.toggleAttribute('checked', preferences.xrefUIState.showOnlyConnected)
      uiDiv = newDiv
    }
    return uiDiv
  }

  private get _connectedUsers(): UserFrequencies {
    const connectedUsers: Map<number, number> = new Map()
    this._ipGroups.forEach((ipGroup) =>
      ipGroup.connectedUsers.forEach((uid) =>
        connectedUsers.set(uid, (connectedUsers.get(uid) ?? 0) + 1)
      )
    )
    return [...connectedUsers.entries()]
      .map(([uid, count]) => ({ uid, count }))
      .sort(
        ({ uid: uA, count: cA }, { uid: uB, count: cB }) => cB - cA || uA - uB
      ) // sort by count desc, uid asc
  }

  connect(): void {
    this.element.insertAdjacentElement('afterbegin', this._uiDiv)
    this._updateConnectedUsersList(this._connectedUsers)
    this._updateFocusedUsersList()
  }

  [outletConnected(HistogramController)](outlet: HistogramController): void {
    outlet.setFrequencies(this._connectedUsers)
  }

  reloadPreferences() {
    reloadPreferences()
    this._refresh()
  }

  showConnected({ detail: { connCount } }: { detail: Bucket }): void {
    if (connCount !== this._threshold) {
      this._threshold = connCount
      this._refreshConnectedUsers(this._connectedUsers)
    }
  }

  toggleOnly({ target }: { target: HTMLInputElement }): void {
    preferences.xrefUIState.showOnlyConnected = target.checked
    this._ipGroups.forEach((ipGroup) => ipGroup.refresh(target.checked))
  }

  sectionToggled({ target }: { target: HTMLElement }): void {
    const name = target.getAttribute('aria-controls')
    if (name && Object.hasOwn(preferences.xrefUIState.openedSections, name))
      preferences.xrefUIState.openedSections[name] =
        target.getAttribute('aria-expanded') === 'true'
  }

  addFocusUser({ params: { uid } }: { params: { uid: number } }): void {
    const before = preferences.focusedUsers.length
    preferences.focusedUsers = Array.from(
      new Set([...preferences.focusedUsers, uid])
    ).sort((a, b) => a - b)
    if (preferences.focusedUsers.length !== before) this._refresh()
  }

  removeFocusUser({ params: { uid } }: { params: { uid: number } }): void {
    const before = preferences.focusedUsers.length
    preferences.focusedUsers = preferences.focusedUsers.filter(
      (focusedUid) => focusedUid !== uid
    )
    if (preferences.focusedUsers.length !== before) this._refresh()
  }

  clearFocusUsers(): void {
    if (!confirm('Clear all focused users?')) return
    if (preferences.focusedUsers.length > 0) {
      preferences.focusedUsers = []
      this._refresh()
    }
  }

  copyFocusUsers({ target }: { target: HTMLElement }): void {
    // list userids, and if available, their username slug.
    const users = preferences.focusedUsers.map((uid) => {
      const userLink = this.focusedUsersTarget.querySelector<HTMLAnchorElement>(
        `a[href^="/users/${uid}/"]`
      )
      return userLink
        ? userLink.href.replace(/.*\/users\//, '')
        : uid.toFixed(0)
    })
    const text = users.join('\n')
    const button = target.closest('button')
    navigator.clipboard
      .writeText(text)
      .then(() => {
        button?.classList.add('is-copied')
        return new Promise((resolve) => setTimeout(resolve, 1500))
      })
      .then(() => button?.classList.remove('is-copied'))
  }

  updateFocusUsersGraphLink({ detail: uids }: { detail: number[] }): void {
    const today = luxon.DateTime.utc()
    const periodStart = today.minus({ days: 14 })
    const graphLink = this.focusUsersGraphLinkTarget
    const url = new URL(graphLink.href)
    url.hash = `${usDate(periodStart)}|${usDate(today)}|${uids.join(',')}`
    graphLink.href = url.toString()
  }

  _refreshId: number | null = null

  private _refresh(): void {
    if (this._refreshId !== null) return
    this._refreshId = window.requestAnimationFrame(() => {
      this._threshold = 0
      this._updateFocusedUsersList()
      const connectedUsers = this._connectedUsers
      this._histogram.setFrequencies(connectedUsers, false)
      this._refreshConnectedUsers(connectedUsers)
      this._refreshId = null
    })
  }

  private _refreshConnectedUsers(connectedUsers: UserFrequencies): void {
    this._ipGroups.forEach((ipGroup) =>
      ipGroup.updateUsersBelowThreshold(this._threshold, connectedUsers)
    )
    this._updateConnectedUsersList(connectedUsers)
  }

  private _updateConnectedUsersList(connectedUsers: UserFrequencies): void {
    const doUpdate = () => {
      const connectedUsersDiv = this.connectedUsersTarget
      connectedUsersDiv.replaceChildren()
      connectedUsers.forEach(({ uid, count }) => {
        if (count < this._threshold) return
        const overlap = `Overlaps on ${count} IP${count !== 1 ? 's' : ''}`
        connectedUsersDiv.insertAdjacentHTML(
          'beforeend',
          `<div class="s-sidebarwidget--item ai-center"
              data-uid="${uid}"
              data-${UserListController.controllerId}-target="userRow"
              data-user-card-keep-first="true"
          >
            <div class="s-user-card" data-uid="${uid}">
              <span class="s-user-card--time">${overlap}</span>
              <span class="s-avatar s-avatar__32 s-user-card--avatar">
                <span class="anonymous-gravatar s-avatar--image"></span>
              </span>
              <div class="s-user-card--info">user${uid}</div>
            </div>
            <div class="s-user-actions ml-auto">
              <button class="s-btn s-btn__icon s-btn__xs"
                      data-controller="s-tooltip"
                      data-action="${controllerId}#addFocusUser"
                      data-${controllerId}-uid-param="${uid}" 
                      title="Add this user to the focused accounts list"
                >
                  ${IconEyeSm}
                  <span class="md:d-none">Focus</span>
                </button>
            </div>
          </div>`
        )
      })
    }
    // if already contained in an animationFrame handler, run directly.
    this._refreshId === null
      ? window.requestAnimationFrame(doUpdate)
      : doUpdate()
  }

  private _updateFocusedUsersList(): void {
    const focusedUsersDiv = this.focusedUsersTarget
    focusedUsersDiv.replaceChildren()
    preferences.focusedUsers.forEach((uid) => {
      focusedUsersDiv.insertAdjacentHTML(
        'beforeend',
        `<div class="s-sidebarwidget--item"
              data-uid="${uid}"
              data-${UserListController.controllerId}-target="userRow"
          >
            <div class="s-user-card">
              <span class="s-avatar s-avatar__32 s-user-card--avatar">
                <span class="anonymous-gravatar s-avatar--image"></span>
              </span>
              <div class="s-user-card--info">user${uid}</div>
            </div>
            <div class="s-user-actions ml-auto">
              <button class="s-btn s-btn__icon s-btn__xs s-btn__danger"
                      data-controller="s-tooltip"
                      data-action="${controllerId}#removeFocusUser"
                      data-${controllerId}-uid-param="${uid}" 
                      title="Remove this user from the focused accounts list"
                >${IconEyeOffSm}
                  <span class="md:d-none">Remove</span>
                </button>
            </div>
          </div>
        </div>`
      )
    })
  }
}
