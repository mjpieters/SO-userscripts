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
  return luxon.Interval.fromDateTimes(
    ...(Array.from(
      tr.querySelectorAll<HTMLSpanElement>('td .relativetime[title]')
    ).map((e) => parseDateTime(e.title)) as [luxon.DateTime, luxon.DateTime])
  )
}

export function innerRect(elem: Element): {
  width: number
  height: number
} {
  const compStyle = window.getComputedStyle(elem)
  return {
    width:
      elem.clientWidth -
      parseFloat(compStyle.paddingLeft) -
      parseFloat(compStyle.paddingRight),
    height:
      elem.clientHeight -
      parseFloat(compStyle.paddingTop) -
      parseFloat(compStyle.paddingBottom),
  }
}

/** Context manager that ensures an element is visible temporarily */
export function* ensureHasSize(elem: Element): Generator<void> {
  // add every zero-width parent to an array, then remove d-none classes and
  // open any expandables until elements are visible again.  Remember what
  // we need to undo afterwards.
  const path = []
  for (
    let e: Element | null = elem;
    e?.clientWidth === 0;
    e = e?.parentElement
  ) {
    path.unshift(e)
  }
  const undo = []
  for (const elem of path) {
    if (elem.clientWidth !== 0) break
    const cl = elem.classList
    if (cl.contains('d-none')) {
      cl.remove('d-none')
      undo.push(cl)
    }
  }
  try {
    yield
  } finally {
    for (const cl of undo) cl.add('d-none')
  }
}
