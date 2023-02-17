/* global Stacks */
import {
  controllerId,
  gridLineHeightRatio,
  histBarSpacing,
  histBarWidth,
  maxhistBars,
} from '../constants'
import { UserFrequencies } from './types'

export type Bucket = {
  // number of ip addresses on which a user connected with the focus account(s)
  // This is the bucket 'name'
  connCount: number
  // number of users with the given IP count
  // This is the bucket 'value', the height of the bar
  userCount: number
  label: string
}

const histogramStyles = `
  .s-${controllerId}__connected-histogram svg rect {
    fill: var(--theme-secondary-400);
  }
  .s-${controllerId}__connected-histogram svg rect.threshold,
  .s-${controllerId}__connected-histogram svg rect.threshold ~ rect{
    fill: var(--theme-primary-500);
  }
  .s-${controllerId}__connected-histogram svg rect:hover {
    fill: var(--theme-primary-300) !important;
  }
  .s-${controllerId}__connected-histogram svg .gridLines {
    stroke: var(--black-150);
  }
  `

function innerRect(elem: Element): {
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
function* ensureHasSize(elem: Element): Generator<void> {
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
      undo.push((c = cl) => c.add('d-none'))
    }
    if (cl.contains('s-expandable') && !cl.contains('is-expanded'))
      undo.push((c = cl) => c.remove('is-expanded'))
  }
  try {
    yield
  } finally {
    for (const fn of undo) fn()
  }
}

export class HistogramController extends Stacks.StacksController {
  static controllerId = `${controllerId}-histogram`

  static targets = ['svg']
  declare readonly svgTarget: SVGSVGElement

  private _buckets: Bucket[] = []
  private _logScale = false

  static afterLoad(identifier: string): void {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style id="${identifier}-styles">${histogramStyles}</style>`
    )
  }

  connect() {
    this.svgTarget.addEventListener('click', this._propagateEvent.bind(this))
    this.svgTarget.addEventListener('hover', this._propagateEvent.bind(this))
  }

  disconnect() {
    this.svgTarget.removeEventListener('click', this._propagateEvent.bind(this))
    this.svgTarget.removeEventListener('hover', this._propagateEvent.bind(this))
  }

  private _svgRatioCache: number
  private get _svgRatio(): number {
    if (this._svgRatioCache === undefined) {
      for (const _ of ensureHasSize(this.svgTarget)) {
        const bounds = innerRect(this.svgTarget)
        this._svgRatioCache = bounds.height / bounds.width
      }
    }
    return this._svgRatioCache
  }

  private _adjustThresholdClasses(threshold: number): void {
    this.svgTarget
      .querySelectorAll('.threshold')
      .forEach((rect) => rect.classList.remove('threshold'))
    this.svgTarget
      .querySelector(`rect[data-bucket-conn-count="${threshold}"]`)
      ?.classList.add('threshold')
  }

  private _propagateEvent(e: Event): void {
    const target = e.target as SVGRectElement
    const index = target.dataset.bucketIndex
    if (index === undefined) return

    const bucket = this._buckets[parseInt(index)]
    if (e.type === 'click') this._adjustThresholdClasses(bucket.connCount)

    this.dispatch(e.type, { detail: bucket })
  }

  setFrequencies(userFrequencies: UserFrequencies, dispatchEvent = true) {
    // first clear the existing histogram
    this.svgTarget.replaceChildren()
    this._buckets = []
    if (userFrequencies.length === 0) return

    const minConnCount = userFrequencies[userFrequencies.length - 1].count
    const maxConnCount = userFrequencies[0].count
    for (let i = minConnCount; i <= maxConnCount; i++) {
      this._buckets.push({
        connCount: i,
        userCount: 0,
        label: `Overlapping on ${i} ip(s)`,
      })
    }
    userFrequencies.forEach(
      ({ count }) => (this._buckets[count - minConnCount].userCount += 1)
    )

    if (this._buckets.length > maxhistBars) {
      // combine buckets to keep the histogram manageable when there are
      // a large number of IP addresses.
      const bucketCount = Math.ceil(this._buckets.length / maxhistBars)
      const newBuckets: Bucket[] = []
      for (let i = 0; i < this._buckets.length; i += bucketCount) {
        const connCount = this._buckets[i].connCount
        const lastConnCount =
          this._buckets[Math.min(this._buckets.length, i + bucketCount) - 1]
            .connCount
        const userCount = this._buckets
          .slice(i, i + bucketCount)
          .reduce((acc, { userCount }) => acc + userCount, 0)
        newBuckets.push({
          connCount: connCount,
          userCount,
          label:
            connCount !== lastConnCount
              ? `Overlapping ${connCount}-${lastConnCount} ip(s)`
              : `Overlapping ${connCount} ip(s)`,
        })
      }
      this._buckets = newBuckets
    }

    // lowest and highest non-zero frequencies
    const [minFreq, maxFreq] = this._buckets.reduce(
      ([min, max], { userCount }) => [
        Math.min(min, Math.max(userCount, 1)),
        Math.max(max, userCount),
      ],
      [Infinity, 1]
    )
    this._logScale = maxFreq > 10 * minFreq
    console.log('Histogram scale uses log?', this._logScale)

    // don't bother when it's just one bucket or fewer.
    if (this._buckets.length <= 1) return

    this._drawBarChart()
    this._adjustThresholdClasses(this._buckets[0].connCount)
    if (dispatchEvent) this.dispatch('click', { detail: this._buckets[0] })
  }

  private _drawBarChart() {
    const svgWidth =
      this._buckets.length * (histBarWidth + histBarSpacing) + histBarSpacing
    const svgHeight = svgWidth * this._svgRatio
    this.svgTarget.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)

    // Bars are scaled to fit the available height; when using log10 scale
    // we do need to give bars with count 1 a minimum height (roughly half the
    // height of bars with count 2, as log10(1) is otherwise 0).
    const scaleHeight = this._logScale
      ? (y: number) => (y > 0 ? Math.log10(y) || 0.15 : y)
      : (y: number) => y
    const maxValue = Math.max(
      ...this._buckets.map(({ userCount }) => userCount)
    )
    const scaleCoef = svgHeight / scaleHeight(maxValue)

    // height gridlines
    const strokeWidth = svgHeight * gridLineHeightRatio
    this.svgTarget.insertAdjacentHTML(
      'beforeend',
      `<g stroke-width="${strokeWidth}" class="gridLines">
        <defs><line id="gridLine" x1="0" x2="${svgWidth}" y1="0" y2="0" /></defs>
        <use href="#gridLine" />
       </g>`
    )
    const gridLines = this.svgTarget.querySelector('g.gridLines') as SVGGElement
    // grid line spacing differs when using log10 scale (going up by powers of 10)
    // and when using linear scale (drawing at most 10 such lines)
    const gridStep = this._logScale
      ? (y: number) => Math.pow(10, Math.floor(Math.log10(y || 1)))
      : (_: any, step = Math.max(Math.floor(maxValue / 10), 1)) => step
    let y = 0
    while (y < maxValue) {
      const height = svgHeight - scaleHeight(y) * scaleCoef
      gridLines.insertAdjacentHTML(
        'beforeend',
        `<use href="#gridLine" y="${height}" />`
      )
      y += gridStep(y)
    }

    // histogram bars
    this._buckets.forEach((bucket, index) => {
      const height = scaleHeight(bucket.userCount) * scaleCoef
      const rect = `
        <rect
          width="${histBarWidth}" height="${height}"
          x="${(histBarWidth + histBarSpacing) * index + histBarSpacing}"
          y="${svgHeight - height}"
          data-bucket-index="${index}"
          data-bucket-conn-count="${bucket.connCount}"
        >
          <title>${bucket.label}: ${bucket.userCount} account${
        bucket.userCount === 1 ? '' : 's'
      }</title>
        </rect>
       `
      this.svgTarget.insertAdjacentHTML('beforeend', rect)
    })
  }
}
