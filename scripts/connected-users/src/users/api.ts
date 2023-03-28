/*
 * Fetch users from the Stack Exchange API
 */
import { LruCache } from '../utils'
import { StackExchangeAPI } from '../seAPI'
import { minimalUserFilter, seAPIKey, userAPICacheSize } from '../constants'

import { DeletedUser, ExistingUser, User } from './classes'

type JSONUser = Parameters<(typeof ExistingUser)['fromJSON']>[0]
const apiCache = new LruCache<number, User>(userAPICacheSize)
const api = new StackExchangeAPI(seAPIKey)

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
    const results = await api.fetch<JSONUser>(
      `/users/{ids}`,
      { ids: queryIds },
      { filter: minimalUserFilter }
    )
    const byUserId = new Map(
      results.map((user) => [user.user_id, ExistingUser.fromJSON(user)])
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
