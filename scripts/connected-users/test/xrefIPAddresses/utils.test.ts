/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* global luxon */

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

import {
  ensureHasSize,
  innerRect,
  parseAccessInterval,
} from '@connected-users/xrefIPAddresses/utils'

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
      value: {
        DateTime: { fromISO: fromISOMock },
        Interval: { fromDateTimes: fromDateTimesMock },
      },
      configurable: true,
    })
  })

  afterAll(() => {
    delete (global as unknown as { luxon: unknown }).luxon
  })

  test('from table rows with relative time elements', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td><span title="2016-11-28 23:31:16Z" class="relativetime">Nov 28, 2016 at 23:31</span></td>
          <td><span title="2017-12-15 05:02:04Z" class="relativetime">Dec 15, 2017 at 5:02</span></td>
        </tr> 
      </table>`
    const tr = document.querySelector<HTMLTableRowElement>('tr')!

    const result = parseAccessInterval(tr)
    expect(fromDateTimesMock).toHaveBeenCalledWith(mockDate1, mockDate2)
    expect(fromISOMock.mock.calls).toEqual([
      ['2016-11-28T23:31:16Z', { zone: 'utc' }],
      ['2017-12-15T05:02:04Z', { zone: 'utc' }],
    ])
    expect(result).toBe(expected)
  })
})

describe('We can get the inner rectangle size of an element', () => {
  const elem = document.createElement('div')

  beforeAll(() => {
    Object.defineProperties(elem, {
      clientWidth: { value: 42, configurable: true },
      clientHeight: { value: 17, configurable: true },
    })
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingLeft: '1',
      paddingRight: '5',
      paddingTop: '3',
      paddingBottom: '7',
    } as CSSStyleDeclaration)
  })

  afterAll(() => {
    delete (elem as unknown as { clientWidth: unknown }).clientWidth
    delete (elem as unknown as { clientHeight: unknown }).clientHeight
    jest.restoreAllMocks()
  })

  test('given its CSS padding', () => {
    expect(innerRect(elem)).toEqual({ width: 36, height: 7 })
  })
})

describe('Given an invisible element inside expandable divs', () => {
  document.body.innerHTML = `
    <div id="d0">
      <div class="d-none" id="d1">
        <div class="d-none other" id="d2">
          <div id="d3"></div>
        </div>
      </div>
    </div>
  `
  const elems = [0, 1, 2, 3].map((i) => document.getElementById(`d${i}`)!)
  const inner = elems[elems.length - 1]
  const expectedClasses = ['', '', 'other']

  beforeAll(() => {
    const widths = [42, 0, 0, 0]
    for (const [i, width] of widths.entries()) {
      Object.defineProperty(elems[i], 'clientWidth', {
        value: width,
        configurable: true,
      })
    }
  })

  afterAll(() => {
    for (const elem of elems)
      delete (elem as unknown as { clientWidth: unknown }).clientWidth
  })

  test('we can make the element temporarily visible', () => {
    for (const _ of ensureHasSize(inner)) {
      for (const [i, expected] of expectedClasses.entries()) {
        expect(elems[i].className).toBe(expected)
      }
    }
  })
})
