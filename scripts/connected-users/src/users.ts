/*
 * Fetch users from the Stack Exchange API and render to HTML
 */
/* global Stacks */
import { LruCache, seApiFetch } from './utils'
import { controllerId, minimalUserFilter, userAPICacheSize } from './constants'

const abbreviatedRepFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumSignificantDigits: 3,
})
const fullRepFormat = new Intl.NumberFormat('en-US', {
  useGrouping: true,
})

// set padding inside the user cards to 0 in the usercard lists
// _uc-p is the CSS variable set by Stacks and we can override it here.
const userStyles = `.s-${controllerId} .s-user-card { --_uc-p: 0 }`

/* subset of https://api.stackexchange.com/docs/types/user */
class User {
  user_id: number
  badge_counts: {
    bronze: number
    silver: number
    gold: number
  }
  display_name: string
  link: string
  profile_image: string
  reputation: number
  is_employee: boolean
  user_type:
    | 'unregistered'
    | 'registered'
    | 'moderator'
    | 'team_admin'
    | 'does_not_exist'

  // because the moderator-quick-links-everywhere script looks for relative
  // link URLs.
  private get _relativeLink(): string {
    return this.link.replace(/https?:\/\/[^/]+/, '')
  }

  private get _badges(): string {
    const badges = []
    if (this.is_employee) {
      badges.push(
        `<span class="s-badge s-badge__staff s-badge__xs">Staff</span>`
      )
    }
    switch (this.user_type) {
      case 'moderator':
        badges.push(
          `<span class="s-badge s-badge__moderator s-badge__xs">Mod</span>`
        )
        break
      case 'team_admin':
        badges.push(
          `<span class="s-badge s-badge__admin s-badge__xs">Admin</span>`
        )
    }
    return badges.join(' ')
  }

  private get _abbreviated_reputation(): string {
    return this.reputation < 10000
      ? fullRepFormat.format(this.reputation)
      : abbreviatedRepFormat.format(this.reputation).toLowerCase()
  }

  toHTML(): string {
    return `
      <div class="s-user-card" data-uid="${this.user_id}"> 
        <a href="${
          this._relativeLink
        }" class="s-avatar s-avatar__32 s-user-card--avatar">
          <img class="s-avatar--image" src="${this.profile_image}" />
        </a>
        <div class="s-user-card--info">
          <a href="${this.link}" class="s-user-card--link"
            >${this.display_name} ${this._badges}</a
          >
          <ul class="s-user-card--awards">
            <li
              class="s-user-card--rep"
              title="reputation score ${fullRepFormat.format(this.reputation)}"
            >
              ${this._abbreviated_reputation}
            </li>
            <li class="s-award-bling s-award-bling__gold">${
              this.badge_counts.gold
            }</li>
            <li class="s-award-bling s-award-bling__silver">${
              this.badge_counts.silver
            }</li>
            <li class="s-award-bling s-award-bling__bronze">${
              this.badge_counts.bronze
            }</li>
          </ul>
        </div>
      </div>
    `
  }
}

class DeletedUser extends User {
  constructor(userId: number) {
    super()
    this.user_id = userId
    this.link = `/users/${userId}`
  }

  toHTML(): string {
    return `
      <div class="s-user-card s-user-card__deleted">
        <a href="${this.link}" class="s-avatar s-avatar__32 s-user-card--avatar">
          <span class="anonymous-gravatar s-avatar--image"></span>
        </a>
        <div class="s-user-card--info">
          <a href="${this.link}" class="s-user-card--link"
            >user${this.user_id}</a
          >
        </div>
      </div>
    `
  }
}

type JSONUser = {
  [P in keyof User as User[P] extends Function ? never : P]: User[P] // eslint-disable-line @typescript-eslint/ban-types
}

const apiCache = new LruCache<number, User>(userAPICacheSize)

// Fetch users and yield User objects in the same order they are listed in the argument
export async function* fetchUsers(
  userIds: number[],
  missingAssumeDeleted = false
): AsyncGenerator<User, void, undefined> {
  // split into still-cached and to-be-fetched uids
  let toFetch: number[] = []
  const cached = new Map(
    userIds.reduce((resolved, uid) => {
      const user = apiCache.get(uid)
      if (user) return [...resolved, [uid, user]]
      toFetch.push(uid)
      return resolved
    }, [] as [number, User][])
  )
  // fetch the remaining uids in batches of 100
  while (toFetch.length > 0) {
    const queryIds = toFetch.splice(0, 100)
    toFetch = toFetch.splice(100)
    const results = await seApiFetch<JSONUser>(
      `users/${queryIds.join(';')}`,
      minimalUserFilter
    )
    const byUserId = new Map(
      results.map((user) => [user.user_id, Object.assign(new User(), user)])
    )
    const lastFetched = userIds.indexOf(queryIds[queryIds.length - 1]) + 1
    yield* userIds.splice(0, lastFetched).reduce((mapped, uid) => {
      let user = cached.get(uid) || byUserId.get(uid)
      if (user === undefined && missingAssumeDeleted) {
        user = new DeletedUser(uid)
      }
      if (user) apiCache.put(uid, user)
      return user ? [...mapped, user] : mapped
    }, [])
    userIds = userIds.splice(lastFetched)
  }
  // yield any remaining cached users
  yield* userIds.map(
    (uid) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      apiCache.get(uid)!
  )
}

export class UserListController extends Stacks.StacksController {
  static controllerId = `${controllerId}-user-list`

  static targets = ['count', 'userRow']
  declare readonly countTarget: HTMLElement
  declare readonly userRowTargets: HTMLElement[]

  static classes = ['userCard']
  declare readonly userCardClasses: string

  static afterLoad(identifier: string): void {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style id="${identifier}-styles">${userStyles}</style>`
    )
  }

  connect(): void {
    this.updateUsers()
  }

  updateUsers(): void {
    this.countTarget.innerHTML = this.userRowTargets.length.toString()
    // replace sparse user cards with full versions
    // preserves the first child of an existing s-user-card div if the row is
    // marked with data-user-card-keep-first="true"
    const hydrationRows = new Map(
      this.userRowTargets.reduce(
        (entries, row) =>
          row.dataset.hydrated === 'true'
            ? entries
            : [...entries, [parseInt(row.dataset.uid || '0'), row]],
        [] as [number, HTMLDivElement][]
      )
    )
    if (hydrationRows.size === 0) return
    window.requestAnimationFrame(async () => {
      for await (const user of fetchUsers([...hydrationRows.keys()], true)) {
        const userRow = hydrationRows.get(user.user_id)
        if (!userRow) continue
        const firstChild =
          userRow.dataset.userCardKeepFirst === 'true'
            ? userRow
                .querySelector<HTMLDivElement>('.s-user-card :first-child')
                ?.cloneNode(true)
            : null
        const existingCard =
          userRow.querySelector<HTMLDivElement>('.s-user-card')
        if (existingCard) existingCard.outerHTML = user.toHTML()
        else userRow.innerHTML = user.toHTML()
        const newCard = userRow.querySelector('.s-user-card')
        newCard?.classList.add(...this.userCardClasses)
        if (firstChild) {
          newCard?.insertAdjacentElement(
            'afterbegin',
            firstChild as HTMLElement
          )
        }
        userRow.dataset.hydrated = 'true'
      }
      // signal the Mod User Quicklinks Everywhere script
      this.dispatch('moduserquicklinks', { prefix: '' })
      this.dispatch('usersHydrated', {
        detail: this.userRowTargets.reduce(
          (uids, r) =>
            r.querySelector('s-user-card__deleted') === null
              ? [...uids, parseInt(r.dataset.uid || '0')]
              : uids,
          [] as number[]
        ),
      })
    })
  }
}
