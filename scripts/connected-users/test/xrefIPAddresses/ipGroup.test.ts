import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

import * as Stimulus from '@hotwired/stimulus'
import * as luxon from 'luxon'

import { domReady } from '../testUtils'
import * as preferences from '@connected-users/preferences'
import { IpGroupController } from '@connected-users/xrefIPAddresses/ipGroup'

beforeAll(() => {
  Object.defineProperty(global, 'luxon', { value: luxon, configurable: true })
  jest.useFakeTimers()
})
afterAll(() => {
  jest.restoreAllMocks()
  delete (global as unknown as { luxon: unknown }).luxon
})

interface TestUser {
  uid: number
  name: string
  from: string
  to: string
}

const controllerTable = (rows: string[]) => `
<table><tr><td><table>
  <thead><tr><th>User</th><th>Count</th><th>From</th><th>To</th><th>…</th></tr></thead>
  <tbody>${rows.join('')}</tbody>
</table></td></tr></table>
`
const userRow = ({ uid, name, from, to }: TestUser) => `
<tr>
  <td><a href="/users/${uid}">${name}</a></td>
  <td><span title="${from}Z" class="relativetime">_from_</span></td>
  <td><span title="${to}Z" class="relativetime">_to_</span></td>
  <td><a href="/admin/user-activity#">compare</a></td>
</tr>
`

const testUsers: TestUser[] = [
  {
    uid: 1742,
    name: 'Main User',
    from: '2021-01-01T14:11:02',
    to: '2021-02-04T19:03:56',
  },
  {
    uid: 2,
    name: 'Overlapping With Main User',
    from: '2020-12-31T01:02:03',
    to: '2021-03-02T23:01:20',
  },
  {
    uid: 3,
    name: 'Overlapping With Main User and #2',
    from: '2020-12-31T23:59:59',
    to: '2021-01-01T21:17:42',
  },
  {
    uid: 4,
    name: 'Overlapping With UID #2',
    from: '2021-03-01T04:12:03',
    to: '2021-03-02T23:22:20',
  },
  {
    uid: 5,
    name: 'Not Overlapping With Anyone',
    from: '2021-03-31T01:02:03',
    to: '2021-04-02T23:22:20',
  },
]

const setPreferences = (
  prefs: {
    focusedUsers?: number[]
    showOnlyConnected?: boolean
  } = {}
) => {
  if (prefs.focusedUsers !== undefined)
    preferences.preferences.focusedUsers = prefs.focusedUsers
  if (prefs.showOnlyConnected !== undefined)
    preferences.preferences.xrefUIState.showOnlyConnected =
      prefs.showOnlyConnected
}

describe('The IpGroupController manages per-IP-address UI tables', () => {
  const controllerId = IpGroupController.controllerId
  let application: Stimulus.Application

  beforeEach(() => {
    jest.spyOn(window, 'location', 'get').mockReturnValue({
      pathname: '/admin/xref-user-ips/1742',
    } as unknown as Location)
    setPreferences({ focusedUsers: [], showOnlyConnected: false })

    application = Stimulus.Application.start()
    application.register(controllerId, IpGroupController)
  })

  const createController = async (
    users: TestUser[]
  ): Promise<IpGroupController> => {
    document.body.innerHTML = controllerTable(users.map(userRow))
    const elem = document.body.querySelector<HTMLTableRowElement>('table tr')!
    elem.dataset.controller = controllerId

    // wait for the controller to be connected, which happens on domReady
    await domReady()
    return application.getControllerForElementAndIdentifier(
      elem,
      controllerId
    ) as IpGroupController
  }

  test('on connect the UI is enhanced with classes, data attributes and buttons', async () => {
    const controller = await createController(testUsers)
    expect(controller.element).toMatchSnapshot()
  })

  test('on load the focusedUsers preference is respected', async () => {
    setPreferences({ focusedUsers: [2] })
    const controller = await createController(testUsers)
    expect(controller.element).toMatchSnapshot()
  })

  test('on load the showOnlyConnected preference is respected', async () => {
    setPreferences({ showOnlyConnected: true })
    const controller = await createController(testUsers)
    expect(controller.element).toMatchSnapshot()
  })

  test('we can refresh the UI, setting showOnlyConnected to true', async () => {
    const controller = await createController(testUsers)
    controller.refresh(true)
    await jest.runAllTimersAsync() // allow next animation frame to run

    const userRows = controller.element.querySelectorAll('tr[data-uid]')
    const classes = [userRows[3].className, userRows[4].className]
    expect(classes).toStrictEqual(['d-none', 'd-none'])
  })

  test('we can refresh the UI, setting showOnlyConnected to false', async () => {
    setPreferences({ showOnlyConnected: true })
    const controller = await createController(testUsers)
    controller.refresh(false)
    await jest.runAllTimersAsync() // allow next animation frame to run

    const userRows = controller.element.querySelectorAll('tr[data-uid]')
    const classes = [userRows[3].className, userRows[4].className]
    expect(classes).toStrictEqual(['', ''])
  })

  test('refreshing is debounced to once per animation frame', async () => {
    const controller = await createController(testUsers)
    controller.refresh(false)
    controller.refresh(true)
    await jest.runAllTimersAsync() // allow next animation frame to run

    const userRows = controller.element.querySelectorAll('tr[data-uid]')
    const classes = [userRows[3].className, userRows[4].className]
    expect(classes).toStrictEqual(['d-none', 'd-none'])
  })

  test('we can update the highlighted users with a threshold', async () => {
    const controller = await createController(testUsers)
    controller.updateUsersBelowThreshold(3, [
      { uid: 2, count: 2 },
      { uid: 3, count: 3 },
    ])
    await jest.runAllTimersAsync() // allow next animation frame to run

    const userRows = controller.element.querySelectorAll('tr[data-uid]')
    const classes = [userRows[1].className, userRows[2].className]
    expect(classes).toStrictEqual(['', 's-overlap'])
  })

  test('we can query the connected user ids', async () => {
    const controller = await createController(testUsers)
    expect(controller.connectedUsers).toStrictEqual([2, 3])
  })

  test('we can query the connected user ids, with focusedUsers set', async () => {
    setPreferences({ focusedUsers: [2] })
    const controller = await createController(testUsers)
    expect(controller.connectedUsers).toStrictEqual([3, 4])
  })
})
