/*
 * Provide classes representing users from the Stack Exchange API, with HTML rendering
 */
import { escapeHtml } from '../utils'

type JSONReflection<T> = {
  [P in keyof T as T[P] extends Function ? never : P]: T[P] // eslint-disable-line @typescript-eslint/ban-types
}
type Constructor<T> = new (...args: any[]) => T
export interface JSONLoadable<T> {
  new (): T
  fromJSON(json: JSONReflection<T>): T
}

const abbreviatedRepFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumSignificantDigits: 3,
})
const fullRepFormat = new Intl.NumberFormat('en-US', {
  useGrouping: true,
})

export abstract class User {
  user_id: number
  link: string

  constructor() {} // eslint-disable-line no-useless-constructor,@typescript-eslint/no-empty-function

  // because the moderator-quick-links-everywhere script looks for relative
  // link URLs.
  protected get relativeLink(): string {
    const url = new URL(this.link)
    return url.origin === location.origin ? url.pathname : this.link
  }

  abstract toHTML(): string

  private cachedNode: HTMLElement | null = null

  get node(): HTMLElement {
    if (this.cachedNode === null) {
      const node = document.createElement('div')
      node.innerHTML = this.toHTML()
      this.cachedNode = node.firstElementChild as HTMLElement
    }
    return this.cachedNode
  }
}

/* subset of https://api.stackexchange.com/docs/types/user */
export class ExistingUser extends User {
  badge_counts: {
    bronze: number
    silver: number
    gold: number
  }
  display_name: string
  profile_image: string
  reputation: number
  is_employee: boolean
  user_type:
    | 'unregistered'
    | 'registered'
    | 'moderator'
    | 'team_admin'
    | 'does_not_exist'

  private get badges(): string {
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

  static fromJSON<T extends ExistingUser>(
    this: Constructor<T>,
    json: JSONReflection<T>
  ): T {
    const user = new this()
    Object.assign(user, json)
    return user
  }

  private get abbreviatedReputation(): string {
    return this.reputation < 10000
      ? fullRepFormat.format(this.reputation)
      : abbreviatedRepFormat.format(this.reputation).toLowerCase()
  }

  toHTML(): string {
    return `
      <div class="s-user-card" data-uid="${this.user_id}"> 
        <a href="${
          this.relativeLink
        }" class="s-avatar s-avatar__32 s-user-card--avatar">
          <img class="s-avatar--image" src="${this.profile_image}" />
        </a>
        <div class="s-user-card--info">
          <a href="${this.link}" class="s-user-card--link"
            >${escapeHtml(this.display_name)} ${this.badges}</a
          >
          <ul class="s-user-card--awards">
            <li
              class="s-user-card--rep"
              title="reputation score ${fullRepFormat.format(this.reputation)}"
            >
              ${this.abbreviatedReputation}
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

export class DeletedUser extends User {
  constructor(userId: number) {
    super()
    this.user_id = userId || 0
    this.link = `${location.origin}/users/${this.user_id}`
  }

  toHTML(): string {
    return `
      <div class="s-user-card s-user-card__deleted">
        <a href="${this.relativeLink}" class="s-avatar s-avatar__32 s-user-card--avatar">
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
