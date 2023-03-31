import { describe, expect, test } from '@jest/globals'

import {
  genHistogramBuckets,
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
      [{ connCount: 1, userCount: 1, label: 'Overlapping on 1 ip(s)' }],
    ],
    [
      [
        { uid: 1, count: 1 },
        { uid: 2, count: 1 },
      ],
      [{ connCount: 1, userCount: 2, label: 'Overlapping on 1 ip(s)' }],
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
        { connCount: 2, userCount: 3, label: 'Overlapping on 2 ip(s)' },
        { connCount: 3, userCount: 0, label: 'Overlapping on 3 ip(s)' },
        { connCount: 4, userCount: 0, label: 'Overlapping on 4 ip(s)' },
        { connCount: 5, userCount: 2, label: 'Overlapping on 5 ip(s)' },
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
        { connCount: 2, userCount: 2, label: 'Overlapping on 2-3 ip(s)' },
        { connCount: 4, userCount: 2, label: 'Overlapping on 4-5 ip(s)' },
        { connCount: 6, userCount: 0, label: 'Overlapping on 6-7 ip(s)' },
        { connCount: 8, userCount: 0, label: 'Overlapping on 8-9 ip(s)' },
        { connCount: 10, userCount: 0, label: 'Overlapping on 10-11 ip(s)' },
        { connCount: 12, userCount: 0, label: 'Overlapping on 12-13 ip(s)' },
        { connCount: 14, userCount: 0, label: 'Overlapping on 14-15 ip(s)' },
        { connCount: 16, userCount: 0, label: 'Overlapping on 16-17 ip(s)' },
        { connCount: 18, userCount: 0, label: 'Overlapping on 18-19 ip(s)' },
        { connCount: 20, userCount: 0, label: 'Overlapping on 20-21 ip(s)' },
        { connCount: 22, userCount: 0, label: 'Overlapping on 22-23 ip(s)' },
        { connCount: 24, userCount: 1, label: 'Overlapping on 24 ip(s)' },
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
        { connCount: 2, userCount: 3, label: 'Overlapping on 2-4 ip(s)' },
        { connCount: 5, userCount: 1, label: 'Overlapping on 5-7 ip(s)' },
        { connCount: 8, userCount: 0, label: 'Overlapping on 8-10 ip(s)' },
        { connCount: 11, userCount: 0, label: 'Overlapping on 11-13 ip(s)' },
        { connCount: 14, userCount: 0, label: 'Overlapping on 14-16 ip(s)' },
        { connCount: 17, userCount: 0, label: 'Overlapping on 17-19 ip(s)' },
        { connCount: 20, userCount: 0, label: 'Overlapping on 20-22 ip(s)' },
        { connCount: 23, userCount: 0, label: 'Overlapping on 23-25 ip(s)' },
        { connCount: 26, userCount: 0, label: 'Overlapping on 26-28 ip(s)' },
        { connCount: 29, userCount: 0, label: 'Overlapping on 29-31 ip(s)' },
        { connCount: 32, userCount: 0, label: 'Overlapping on 32-34 ip(s)' },
        { connCount: 35, userCount: 0, label: 'Overlapping on 35-37 ip(s)' },
        { connCount: 38, userCount: 0, label: 'Overlapping on 38-40 ip(s)' },
        { connCount: 41, userCount: 0, label: 'Overlapping on 41-43 ip(s)' },
        { connCount: 44, userCount: 0, label: 'Overlapping on 44-46 ip(s)' },
        { connCount: 47, userCount: 1, label: 'Overlapping on 47-48 ip(s)' },
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
