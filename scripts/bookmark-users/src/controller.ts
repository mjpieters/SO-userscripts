/* global Stacks, StackExchange */
import { html } from 'common-tags'

import { fetchBookmarkers } from './sedeQuery'
import { fetchUsers } from './users'
import { controllerId } from './constants'

type State = 'initial' | 'attached' | 'loading' | 'loaded'

const bookmarkersButton = html`
  <button
    class="s-btn s-btn__unset c-pointer py4"
    data-controller="s-tooltip ${controllerId}"
    data-s-popover-toggle-class="fc-yellow-600"
    data-s-tooltip-placement="right"
    data-action="click->s-popover#toggle s-popover:show->${controllerId}#showBookmarkers"
    aria-pressed="false"
    title="Show who bookmarked this question."
  >
    <svg
      aria-hidden="true"
      class="svg-icon iconPerson"
      width="18"
      height="18"
      viewBox="0 0 18 18"
    >
      <path
        d="M15 15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1c0-2.63 4-4 4-4s.23-.4 0-1c-.84-.62-.94-1.59-1-4 .17-2.41 1.87-3 3-3s2.83.59 3 3c-.06 2.41-.16 3.38-1 4-.23.59 0 1 0 1s4 1.37 4 4v1Z"
      ></path>
    </svg>
  </button>
`
// Stacks styling classes:
// - We need an inner div so overflow changes are not affecting the popover arrow div
// - The minimal usercards are flex items and so dictate a width that'll overflow. Limit
//   the width of the inner popover div with wmx100 (maximum width 100% of the parent
//   popover div)
// - The inner div is the scroll container, with hmx3 setting the maximum height; it can
//   be smaller if there are just a few users listed.
// - The inner popover div is a flex container, and gs8 / gsy handles the gutter between
//   the items, and m4 setting the margin between the outer and inner containers.
// - The contained unordered list requires mr-auto (margin-right: auto) to compensate
//   for flex-item shenenigans; without this the list is shifted too far left.
const popoverDiv = html`
  <div
    class="${controllerId}-popover s-popover"
    role="dialog"
    aria-hidden="true"
  >
    <div class="s-popover--arrow"></div>
    <div class="m4 hmx3 wmx100 overflow-x-hidden overflow-y-auto">
      <div
        class="${controllerId}-popover-inner d-flex fd-column flex__center gs8 gsy"
      >
        <ul class="list-reset flex--item mr-auto"></ul>
        <div class="s-spinner s-spinner__sm flex--item">
          <div class="v-visible-sr">Loading…</div>
        </div>
      </div>
    </div>
  </div>
`

export class BookmarkersController extends Stacks.StacksController {
  state: State = 'initial'
  popoverElement?: HTMLElement

  static attach(element?: HTMLElement): void {
    if (
      // If the bookmark count is not visible, bail
      element.querySelector<HTMLElement>('.js-bookmark-count')?.offsetParent ===
      null
    ) {
      return
    }
    element.insertAdjacentHTML('afterend', bookmarkersButton)
    Stacks.application.register(controllerId, BookmarkersController)
  }

  connect(): void {
    if (this.state !== 'initial') {
      return
    }

    this.state = 'attached'
    Stacks.attachPopover(this.element, popoverDiv)
    this.popoverElement = document.getElementById(
      this.element.getAttribute('aria-controls')
    )
  }

  async showBookmarkers(): Promise<void> {
    if (this.state !== 'attached') {
      return
    }
    this.state = 'loading'
    const listElement = this.popoverElement.querySelector<HTMLElement>('ul')
    const postId = StackExchange.question.getQuestionId()
    const bookmarkers = await fetchBookmarkers(postId)
    const dateForUid = new Map(bookmarkers.map((b) => [b.userId, b.date]))
    for await (const user of fetchUsers(
      bookmarkers.map((b) => b.userId),
      true
    )) {
      listElement.insertAdjacentHTML(
        'beforeend',
        `<li class="mb4">${user.toHTML(
          dateForUid.get(user.user_id.toFixed(0))
        )}</li>`
      )
    }
    this.state = 'loaded'
    this.popoverElement.querySelector<HTMLElement>('.s-spinner').remove()
  }
}
