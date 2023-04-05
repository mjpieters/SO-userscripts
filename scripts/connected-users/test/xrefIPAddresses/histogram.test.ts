import { describe, beforeEach, expect, test } from '@jest/globals'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

import * as Stimulus from '@hotwired/stimulus'

import { domReady } from '../testUtils'
import {
  genHistogramBuckets,
  HistogramController,
  Bucket,
} from '@connected-users/xrefIPAddresses/histogram'
import { UserFrequencies } from '@connected-users/xrefIPAddresses/types'

describe('We can generate histogram buckets', () => {
  test('No users means no buckets', () => {
    const { buckets: result } = genHistogramBuckets([])
    expect(result).toEqual([])
  })

  const cases: [UserFrequencies, Bucket[]][] = [
    [
      [{ uid: 1, count: 1 }],
      [{ connCount: 1, userCount: 1, label: 'Overlapping on 1 ip' }],
    ],
    [
      [
        { uid: 1, count: 1 },
        { uid: 2, count: 1 },
      ],
      [{ connCount: 1, userCount: 2, label: 'Overlapping on 1 ip' }],
    ],
    [
      [
        { uid: 1, count: 5 },
        { uid: 2, count: 5 },
        { uid: 3, count: 2 },
        { uid: 4, count: 2 },
        { uid: 5, count: 2 },
      ],
      [
        { connCount: 2, userCount: 3, label: 'Overlapping on 2 ips' },
        { connCount: 3, userCount: 0, label: 'Overlapping on 3 ips' },
        { connCount: 4, userCount: 0, label: 'Overlapping on 4 ips' },
        { connCount: 5, userCount: 2, label: 'Overlapping on 5 ips' },
      ],
    ],
    [
      [
        { uid: 1, count: 24 },
        { uid: 2, count: 5 },
        { uid: 3, count: 4 },
        { uid: 4, count: 3 },
        { uid: 5, count: 2 },
      ],
      [
        { connCount: 2, userCount: 2, label: 'Overlapping on 2-3 ips' },
        { connCount: 4, userCount: 2, label: 'Overlapping on 4-5 ips' },
        { connCount: 6, userCount: 0, label: 'Overlapping on 6-7 ips' },
        { connCount: 8, userCount: 0, label: 'Overlapping on 8-9 ips' },
        { connCount: 10, userCount: 0, label: 'Overlapping on 10-11 ips' },
        { connCount: 12, userCount: 0, label: 'Overlapping on 12-13 ips' },
        { connCount: 14, userCount: 0, label: 'Overlapping on 14-15 ips' },
        { connCount: 16, userCount: 0, label: 'Overlapping on 16-17 ips' },
        { connCount: 18, userCount: 0, label: 'Overlapping on 18-19 ips' },
        { connCount: 20, userCount: 0, label: 'Overlapping on 20-21 ips' },
        { connCount: 22, userCount: 0, label: 'Overlapping on 22-23 ips' },
        { connCount: 24, userCount: 1, label: 'Overlapping on 24 ips' },
      ],
    ],
    [
      [
        { uid: 1, count: 48 },
        { uid: 2, count: 5 },
        { uid: 3, count: 4 },
        { uid: 4, count: 3 },
        { uid: 5, count: 2 },
      ],
      [
        { connCount: 2, userCount: 3, label: 'Overlapping on 2-4 ips' },
        { connCount: 5, userCount: 1, label: 'Overlapping on 5-7 ips' },
        { connCount: 8, userCount: 0, label: 'Overlapping on 8-10 ips' },
        { connCount: 11, userCount: 0, label: 'Overlapping on 11-13 ips' },
        { connCount: 14, userCount: 0, label: 'Overlapping on 14-16 ips' },
        { connCount: 17, userCount: 0, label: 'Overlapping on 17-19 ips' },
        { connCount: 20, userCount: 0, label: 'Overlapping on 20-22 ips' },
        { connCount: 23, userCount: 0, label: 'Overlapping on 23-25 ips' },
        { connCount: 26, userCount: 0, label: 'Overlapping on 26-28 ips' },
        { connCount: 29, userCount: 0, label: 'Overlapping on 29-31 ips' },
        { connCount: 32, userCount: 0, label: 'Overlapping on 32-34 ips' },
        { connCount: 35, userCount: 0, label: 'Overlapping on 35-37 ips' },
        { connCount: 38, userCount: 0, label: 'Overlapping on 38-40 ips' },
        { connCount: 41, userCount: 0, label: 'Overlapping on 41-43 ips' },
        { connCount: 44, userCount: 0, label: 'Overlapping on 44-46 ips' },
        { connCount: 47, userCount: 1, label: 'Overlapping on 47-48 ips' },
      ],
    ],
  ]
  test.each(cases)(
    'Buckets reflect how many users share the same count',
    (freqs, expected) => {
      const { buckets: result, logScale } = genHistogramBuckets(freqs)
      expect(result).toEqual(expected)
      expect(logScale).toBe(false)
    }
  )

  test('The log scale flag is set when the difference between the minimal and maximal counts is too large', () => {
    const freqs = [
      ...[...new Array(10).keys()].map((i) => ({ uid: i, count: 3 })),
      ...[...new Array(1).keys()].map((i) => ({ uid: i + 10, count: 1 })),
    ]
    const { logScale: ls1 } = genHistogramBuckets(freqs)
    expect(ls1).toBe(false)
    const { logScale: ls2 } = genHistogramBuckets([
      { uid: 0, count: 3 },
      ...freqs,
    ])
    expect(ls2).toBe(true)
  })
})

describe('The histogram controller', () => {
  const controllerId = HistogramController.controllerId
  let application: Stimulus.Application
  let controller: HistogramController

  beforeEach(async () => {
    document.body.innerHTML = `
      <div data-controller="${controllerId}" id="controller">
        <svg xmlns="http://www.w3.org/2000/svg" data-${controllerId}-target="svg"></svg>
      </div>
    `
    // Provide enough context for the SVG element to have an inner size
    document.head.innerHTML = '<style>svg { padding: 0px }</style>'
    const svgElem = document.body.getElementsByTagName('svg')[0]
    Object.defineProperties(svgElem, {
      clientWidth: { value: 242, configurable: true },
      clientHeight: { value: 117, configurable: true },
    })

    application = Stimulus.Application.start()
    application.register(controllerId, HistogramController)

    // wait for the controller to be connected, which happens on domReady
    await domReady()
    controller = application.getControllerForElementAndIdentifier(
      document.getElementById('controller') as HTMLElement,
      controllerId
    ) as HistogramController
  })

  test('registers styles after loading', () => {
    const styles = document.getElementById(`${controllerId}-styles`)
    expect(styles).not.toBeNull()
  })

  const cases: [UserFrequencies, Bucket | null][] = [
    [[{ uid: 1, count: 1 }], null],
    [
      [
        { uid: 1, count: 5 },
        { uid: 2, count: 5 },
        { uid: 3, count: 2 },
        { uid: 4, count: 2 },
        { uid: 5, count: 2 },
      ],
      { userCount: 3, connCount: 2, label: 'Overlapping on 2 ips' },
    ],
  ]
  test.each(cases)(
    'renders the histogram whenever frequencies are set',
    (freq) => {
      controller.setFrequencies(freq)
      expect(controller.svgTarget.outerHTML).toMatchSnapshot()
    }
  )

  test.each(cases)(
    'dispatches a click event for the first bucket whenever more than 1 bucket is present',
    (freq, expected) => {
      let dispatchedBucket: Bucket | null = null
      controller.element.addEventListener(
        `${controllerId}:click`,
        (e: CustomEvent<Bucket>) => {
          dispatchedBucket = e.detail
        }
      )
      controller.setFrequencies(freq)
      expect(controller.svgTarget.outerHTML).toMatchSnapshot()
      expect(dispatchedBucket).toStrictEqual(expected)
    }
  )

  test('Moving a pointer over buckets dispatches events with bucket details', async () => {
    const user = userEvent.setup({ delay: null })
    controller.setFrequencies(cases[1][0])

    let dispatchedBucket: Bucket | null = null
    controller.element.addEventListener(
      `${controllerId}:pointerover`,
      (e: CustomEvent<Bucket>) => {
        dispatchedBucket = e.detail
      }
    )
    const bar = screen.getByText('Overlapping on 5 ips: 2 accounts')
    await user.hover(bar)
    expect(dispatchedBucket).toStrictEqual({
      userCount: 2,
      connCount: 5,
      label: 'Overlapping on 5 ips',
    })
  })

  test('Clicking on a bucket dispatches events with bucket details', async () => {
    const user = userEvent.setup({ delay: null })
    controller.setFrequencies(cases[1][0])

    let dispatchedBucket: Bucket | null = null
    controller.element.addEventListener(
      `${controllerId}:click`,
      (e: CustomEvent<Bucket>) => {
        dispatchedBucket = e.detail
      }
    )
    const bar = screen.getByText('Overlapping on 5 ips: 2 accounts')
    await user.click(bar)
    expect(dispatchedBucket).toStrictEqual({
      userCount: 2,
      connCount: 5,
      label: 'Overlapping on 5 ips',
    })
  })
})
