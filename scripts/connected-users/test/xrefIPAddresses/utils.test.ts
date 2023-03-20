/* global luxon */

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

import { parseAccessInterval } from '../../src/xrefIPAddresses/utils'

describe('We can parse date/time strings', () => {
  const expected = { mocked: 'interval' } as unknown as luxon.Interval
  const mockDate1 = { mocked: 'date1' } as unknown as luxon.DateTime
  const mockDate2 = { mocked: 'date2' } as unknown as luxon.DateTime
  const fromISOMock = jest
    .fn<typeof luxon.DateTime.fromISO>()
    .mockReturnValueOnce(mockDate1)
    .mockReturnValueOnce(mockDate2)
  const fromDateTimesMock = jest
    .fn<typeof luxon.Interval.fromDateTimes>()
    .mockReturnValue(expected)

  beforeAll(() => {
    Object.defineProperty(global, 'luxon', {
      get: () => ({
        DateTime: { fromISO: fromISOMock },
        Interval: { fromDateTimes: fromDateTimesMock },
      }),
    })
  })

  afterAll(() => {
    if (Object.hasOwn(global, 'luxon')) {
      delete (global as unknown as { luxon: any }).luxon
    }
  })

  test('from table rows with relative time elements', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td><span title="2016-11-28 23:31:16Z" class="relativetime">Nov 28, 2016 at 23:31</span></td>
          <td><span title="2017-12-15 05:02:04Z" class="relativetime">Dec 15, 2017 at 5:02</span></td>
        </tr> 
      </table>`
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tr = document.querySelector<HTMLTableRowElement>('tr')!

    const result = parseAccessInterval(tr)
    expect(fromDateTimesMock).toHaveBeenCalledWith(mockDate1, mockDate2)
    expect(fromISOMock).toHaveBeenCalledTimes(2)
    expect(result).toBe(expected)
  })
})
