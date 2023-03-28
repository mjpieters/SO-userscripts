/*
 * Fetch users from the Stack Exchange API
 */
import { Cache, LruCache } from '../utils'
import { StackExchangeAPI } from '../seAPI'
import { minimalUserFilter, seAPIKey, userAPICacheSize } from '../constants'

import { DeletedUser, ExistingUser, JSONLoadable, User } from './classes'

type UserFetcherOptions = {
  api: StackExchangeAPI
  cache: Cache<User['user_id'], User>
  missingAssumeDeleted: boolean
}

export class UserFetcher<
  UserType extends JSONLoadable<User> = typeof ExistingUser,
  MissingUser extends User = DeletedUser
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
      api: options.api || new StackExchangeAPI(seAPIKey),
      cache:
        options.cache || new LruCache<User['user_id'], User>(userAPICacheSize),
      missingAssumeDeleted:
        options.missingAssumeDeleted === undefined
          ? false
          : options.missingAssumeDeleted,
    }
    return new UserFetcher(ExistingUser, DeletedUser, config)
  }

  /** Fetch users and yield User objects in the same order they are listed in the argument */
  async *users(
    userIds: InstanceType<UserType>['user_id'][]
  ): AsyncIterableIterator<User> {
    const toFetch: number[] = []
    const byUserId = new Map(
      userIds.reduce((resolved, uid) => {
        const user = this.cache.get(uid)
        if (user === undefined) toFetch.push(uid)
        return user !== undefined ? [...resolved, [uid, user]] : resolved
      }, [] as [User['user_id'], User][])
    )
    if (toFetch.length > 0) {
      const apiResults = this.api.fetchAll<Parameters<UserType['fromJSON']>[0]>(
        '/users/{ids}',
        { ids: toFetch },
        { filter: minimalUserFilter }
      )
      for await (const jsonUser of apiResults) {
        const user = this.UserClass.fromJSON(jsonUser)
        this.cache.put(user.user_id, user)
        byUserId.set(user.user_id, user)
      }
    }
    const get = this.missingAssumeDeleted
      ? (uid: number) => byUserId.get(uid) || this.missingUser(uid)
      : (uid: number) => byUserId.get(uid)
    for (const uid of userIds) {
      const user = get(uid)
      if (user) yield user
    }
  }

  private missingUser(userId: User['user_id']): MissingUser {
    const missing = new this.MissingClass(userId)
    this.cache.put(missing.user_id, missing)
    return missing
  }
}
