/*
 * Fetch users from the Stack Exchange API
 */
import { Cache, LruCache } from '../utils'
import { StackExchangeAPI } from '../seAPI'
import { minimalUserFilter, seAPIKey, userAPICacheSize } from '../constants'

import { DeletedUser, ExistingUser, JSONLoadable, User } from './classes'

interface UserFetcherOptions {
  api: StackExchangeAPI
  cache: Cache<User['user_id'], User>
  missingAssumeDeleted: boolean
}

export class UserFetcher<
  UserType extends JSONLoadable<User> = typeof ExistingUser,
  MissingUser extends User = DeletedUser,
> {
  private readonly api: StackExchangeAPI
  private readonly cache: Cache<User['user_id'], User>
  readonly missingAssumeDeleted: boolean = false

  constructor(
    private readonly UserClass: UserType,
    private readonly MissingClass: new (userId: User['user_id']) => MissingUser,
    options: UserFetcherOptions
  ) {
    this.api = options.api
    this.cache = options.cache
    this.missingAssumeDeleted = options.missingAssumeDeleted
  }

  static withDefaultClasses(
    options: Partial<UserFetcherOptions> = {}
  ): UserFetcher {
    const config: UserFetcherOptions = {
      api: options.api ?? new StackExchangeAPI(seAPIKey),
      cache:
        options.cache ?? new LruCache<User['user_id'], User>(userAPICacheSize),
      missingAssumeDeleted: options.missingAssumeDeleted ?? false,
    }
    return new UserFetcher(ExistingUser, DeletedUser, config)
  }

  /** Fetch users and yield User objects in the same order they are listed in the argument */
  async *users(
    userIds: InstanceType<UserType>['user_id'][]
  ): AsyncIterableIterator<User> {
    const toFetch: User['user_id'][] = []
    const byUserId = new Map(
      userIds.reduce(
        (resolved, uid) => {
          const user = this.cache.get(uid)
          if (user === undefined) toFetch.push(uid)
          return user !== undefined ? [...resolved, [uid, user]] : resolved
        },
        [] as [User['user_id'], User][]
      )
    )

    const get = this.missingAssumeDeleted
      ? (uid: User['user_id']) => byUserId.get(uid) ?? this.missingUser(uid)
      : (uid: User['user_id']) => byUserId.get(uid)
    const uids = userIds.values()
    function* cachedOrMissing(until?: User['user_id']) {
      for (const uid of uids) {
        if (uid === until) break
        const user = get(uid)
        if (user) yield user
      }
    }

    if (toFetch.length > 0) {
      type JSONUser = Parameters<UserType['fromJSON']>[0]
      const order = new Map(toFetch.map((uid, i) => [uid, i]))
      const options = {
        filter: minimalUserFilter,
        compareFn: (a: JSONUser, b: JSONUser) =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          order.get(a.user_id)! - order.get(b.user_id)!,
      }
      const apiResults = this.api.fetchAll<JSONUser>(
        '/users/{ids}',
        { ids: toFetch },
        options
      )
      for await (const jsonUser of apiResults) {
        const user = this.UserClass.fromJSON(jsonUser)
        this.cache.put(user.user_id, user)
        yield* cachedOrMissing(user.user_id)
        yield user
      }
    }

    yield* cachedOrMissing()
  }

  private missingUser(userId: User['user_id']): MissingUser {
    const missing = new this.MissingClass(userId)
    this.cache.put(missing.user_id, missing)
    return missing
  }
}
