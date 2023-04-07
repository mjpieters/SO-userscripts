import {
  afterEach,
  beforeEach,
  describe,
  jest,
  expect,
  test,
} from '@jest/globals'

import { UserFetcher } from '@connected-users/users/api'
import { DeletedUser, ExistingUser, User } from '@connected-users/users/classes'

async function* asAsyncIt<T>(arr: T[]): AsyncIterableIterator<T> {
  yield* arr
}
const kebab = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

const genUser = (id: number, name = 'User Name') => ({
  user_id: id,
  display_name: name,
  badge_counts: { gold: 0, silver: 0, bronze: 0 },
  link: `https://example.com/users/${id}/${kebab(name)}`,
  profile_image: `https://img.example.com/${id}.png`,
  reputation: 1,
  user_type: 'registered',
  is_employee: false,
})

describe('We can fetch users in batches from the Stack Exchange API', () => {
  const MockedAPIClass = jest.createMockFromModule<
    typeof import('@connected-users/seAPI')
  >('@connected-users/seAPI').StackExchangeAPI
  const mockedAPI = new MockedAPIClass()
  const mockFetchAll = jest.mocked(mockedAPI.fetchAll)

  const MockedCache = jest.createMockFromModule<
    typeof import('@connected-users/utils')
  >('@connected-users/utils').LruCache
  const mockedCache = new MockedCache<User['user_id'], User>()
  const mockCacheGet = jest.mocked(mockedCache.get)
  const mockCachePut = jest.mocked(mockedCache.put)

  let fetcher: UserFetcher

  afterEach(() => {
    jest.restoreAllMocks()
  })
  beforeEach(() => {
    fetcher = UserFetcher.withDefaultClasses({
      api: mockedAPI,
      cache: mockedCache,
    })
  })

  test('with an empty cache, all users are fetched from the API', async () => {
    mockFetchAll.mockReturnValue(
      asAsyncIt([1, 2, 3].map((id) => genUser(id, `User ${id}`)))
    )
    const gen = fetcher.users([1, 2, 3])
    for await (const user of gen) {
      expect(user).toBeInstanceOf(ExistingUser)
      expect(mockCachePut).toHaveBeenCalledWith(user.user_id, user)
    }
    expect(mockFetchAll).toHaveBeenCalledWith(
      '/users/{ids}',
      { ids: [1, 2, 3] },
      { filter: expect.any(String), compareFn: expect.any(Function) }
    )
  })

  test('cached users skip the API', async () => {
    mockCacheGet.mockImplementation((id: number) =>
      Object.assign(new ExistingUser(), genUser(id, `User ${id}`))
    )
    const gen = fetcher.users([1, 2, 3])
    for await (const user of gen) {
      expect(user).toBeInstanceOf(ExistingUser)
    }
    expect(mockFetchAll).not.toHaveBeenCalled()
    expect(mockCachePut).not.toHaveBeenCalled()
  })

  test('mixing cached and uncached users produces users in requested order', async () => {
    mockFetchAll.mockReturnValue(
      asAsyncIt([2, 4].map((id) => genUser(id, `User ${id}`)))
    )
    mockCacheGet.mockImplementation((id: number) =>
      [1, 3].includes(id)
        ? Object.assign(new ExistingUser(), genUser(id, `User ${id}`))
        : undefined
    )

    const gen = fetcher.users([1, 2, 3, 4])
    let lastId = 0
    for await (const user of gen) {
      expect(user).toBeInstanceOf(ExistingUser)
      expect(user.user_id).toBeGreaterThan(lastId)
      lastId = user.user_id
    }
    expect(lastId).toBe(4)
    expect(mockFetchAll).toHaveBeenCalledWith(
      '/users/{ids}',
      { ids: [2, 4] },
      { filter: expect.any(String), compareFn: expect.any(Function) }
    )
    expect(mockCachePut.mock.calls).toEqual([
      [2, expect.any(ExistingUser)],
      [4, expect.any(ExistingUser)],
    ])
  })

  test('Missing user IDs are ignored ...', async () => {
    mockFetchAll.mockReturnValue(
      asAsyncIt([2, 4].map((id) => genUser(id, `User ${id}`)))
    )
    const gen = fetcher.users([1, 2, 3, 4])
    const seen: number[] = []
    for await (const user of gen) {
      expect(user).toBeInstanceOf(ExistingUser)
      seen.push(user.user_id)
    }
    expect(seen).toEqual([2, 4])
  })

  test('... unless we configure the fetcher to treat those as deleted', async () => {
    mockFetchAll.mockReturnValue(
      asAsyncIt([2, 4].map((id) => genUser(id, `User ${id}`)))
    )
    const fetcher = UserFetcher.withDefaultClasses({
      api: mockedAPI,
      cache: mockedCache,
      missingAssumeDeleted: true,
    })
    const gen = fetcher.users([1, 2, 3, 4])
    const seen: number[] = []
    for await (const user of gen) {
      expect(user).toBeInstanceOf(user.user_id % 2 ? DeletedUser : ExistingUser)
      seen.push(user.user_id)
    }
    expect(seen).toEqual([1, 2, 3, 4])
  })
})
