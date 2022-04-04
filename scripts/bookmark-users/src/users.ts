/*
 * Fetch users from the Stack Exchange API and render to HTML
 */
/* global StackExchange */
import { seApiFetch } from './utils'
import { minimalUserFilter } from './constants'

const abbreviatedRepFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumSignificantDigits: 3,
})
const fullRepFormat = new Intl.NumberFormat('en-US', {
  useGrouping: true,
})

/* subset of https://api.stackexchange.com/docs/types/user */
class User {
  user_id: number
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

  get badges(): string {
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

  get abbreviated_reputation(): string {
    return this.reputation < 10000
      ? fullRepFormat.format(this.reputation)
      : abbreviatedRepFormat.format(this.reputation).toLowerCase()
  }

  toHTML(date: string): string {
    return `
      <div class="s-user-card s-user-card__minimal">
        <time class="s-user-card--time">${date}</time>
        <a href="${this.link}" class="s-avatar s-user-card--avatar">
          <img class="s-avatar--image" src="${this.profile_image}" />
        </a>
        <div class="s-user-card--info">
          <a href="${this.link}" class="s-user-card--link"
            >${this.display_name} ${this.badges}</a
          >
          <ul class="s-user-card--awards">
            <li
              class="s-user-card--rep"
              title="reputation score ${fullRepFormat.format(this.reputation)}"
            >
              ${this.abbreviated_reputation}
            </li>
          </ul>
        </div>
      </div>
    `
  }
}

class DeletedUser extends User {
  constructor(userId: string) {
    super()
    this.user_id = parseInt(userId)
    this.link = `/users/${userId}`
  }

  toHTML(date: string): string {
    if (StackExchange.options.user.isModerator) {
      return `
        <div class="s-user-card s-user-card__minimal s-user-card__deleted">
          <time class="s-user-card--time">${date}</time>
          <a href="${this.link}" class="s-avatar s-user-card--avatar">
            <span class="anonymous-gravatar"></span>
          </a>
          <div class="s-user-card--info">
            <a href="${this.link}" class="s-user-card--link"
              >user${this.user_id}</a
            >
          </div>
        </div>
      `
    }
    return `
      <div class="s-user-card s-user-card__minimal s-user-card__deleted">
        <time class="s-user-card--time">${date}</time>
        <div class="s-avatar s-user-card--avatar">
          <span class="anonymous-gravatar"></span>
        </a>
        <div class="s-user-card--info">
          <div class="s-user-card--link">user${this.user_id}</a>
        </div>
      </div>
    `
  }
}

type JSONUser = {
  [P in keyof User as User[P] extends Function ? never : P]: User[P] // eslint-disable-line @typescript-eslint/ban-types
}

// Fetch users and yield User objects in the same order they are listed in the argument
export async function* fetchUsers(
  userIds: string[],
  missingAssumeDeleted = false
): AsyncGenerator<User, void, undefined> {
  while (userIds.length > 0) {
    const queryIds = userIds.splice(0, 100)
    userIds = userIds.splice(100)
    const results = await seApiFetch<JSONUser>(
      `users/${queryIds.join(';')}`,
      minimalUserFilter
    )
    const byUserId = new Map(
      results.map((user) => [
        user.user_id.toFixed(0),
        Object.assign(new User(), user),
      ])
    )
    yield* queryIds.reduce((mapped, uid) => {
      let user = byUserId.get(uid)
      if (user === undefined && missingAssumeDeleted) {
        user = new DeletedUser(uid)
      }
      return user ? [...mapped, user] : mapped
    }, [])
  }
}
