/*
 * Fetch users from the Stack Exchange API and render to HTML
 */

const abbreviatedRepFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumSignificantDigits: 3,
})
const fullRepFormat = new Intl.NumberFormat('en-US', {
  useGrouping: true,
})

/* subset of https://api.stackexchange.com/docs/types/user */
export class User {
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

export class DeletedUser extends User {
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
