/* global luxon */

/**
 * Parse an ISO date/time string into a luxon DateTime object in the UTC timezone
 */
export function parseDateTime(dt: string): luxon.DateTime {
  return luxon.DateTime.fromISO(dt.replace(' ', 'T'), { zone: 'utc' })
}

/**
 * For a given XRef user row, extract the start and end dates of user access
 * for this IP address as a luxon Interval object.
 */
export function parseAccessInterval(tr: HTMLTableRowElement): luxon.Interval {
  return luxon.Interval.fromDateTimes.apply(
    this,
    Array.from(
      tr.querySelectorAll<HTMLSpanElement>('td .relativetime[title]')
    ).map((e) => parseDateTime(e.title))
  )
}
