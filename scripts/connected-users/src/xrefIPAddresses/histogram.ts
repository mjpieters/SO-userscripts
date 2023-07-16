/* global Stacks */
import {
  controllerId,
  gridLineHeightRatio,
  histBarSpacing,
  histBarWidth,
  maxhistBars,
} from '../constants'
import { UserFrequencies } from './types'
import { ensureHasSize, innerRect } from './utils'

export interface Bucket {
  // number of ip addresses on which a user connected with the focus account(s)
  // This is the bucket 'name'
  connCount: number
  // number of users with the given IP count
  // This is the bucket 'value', the height of the bar
  userCount: number
  label: string
}

/** Produce histogram buckets for a list of user frequencies, sorted by their counts in _reverse_ order */
export const genHistogramBuckets = (
  userFrequencies: UserFrequencies
): {
  buckets: Bucket[]
  logScale: boolean
} => {
  if (userFrequencies.length === 0) return { buckets: [], logScale: false }

  const buckets: Bucket[] = []
  const minConnCount = userFrequencies[userFrequencies.length - 1].count
  const maxConnCount = userFrequencies[0].count
  for (let i = minConnCount; i <= maxConnCount; i++) {
    buckets.push({
      connCount: i,
      userCount: 0,
      label: `Overlapping on ${i} ip${i === 1 ? '' : 's'}`,
    })
  }
  userFrequencies.forEach(
    ({ count }) => (buckets[count - minConnCount].userCount += 1)
  )

  if (buckets.length > maxhistBars) {
    // combine buckets to keep the histogram manageable when there are
    // a large number of IP addresses.
    const bucketCount = Math.ceil(buckets.length / maxhistBars)
    const newBuckets: Bucket[] = []
    for (let i = 0; i < buckets.length; i += bucketCount) {
      const connCount = buckets[i].connCount
      const lastConnCount =
        buckets[Math.min(buckets.length, i + bucketCount) - 1].connCount
      const userCount = buckets
        .slice(i, i + bucketCount)
        .reduce((acc, { userCount }) => acc + userCount, 0)
      newBuckets.push({
        connCount,
        userCount,
        label:
          connCount !== lastConnCount
            ? `Overlapping on ${connCount}-${lastConnCount} ips`
            : `Overlapping on ${connCount} ips`,
      })
    }
    buckets.splice(0, buckets.length)
    buckets.push(...newBuckets)
  }

  // lowest and highest non-zero frequencies
  const [minFreq, maxFreq] = buckets.reduce(
    ([min, max], { userCount }) => [
      Math.min(min, Math.max(userCount, 1)),
      Math.max(max, userCount),
    ],
    [Infinity, 1]
  )
  return { buckets, logScale: maxFreq > 10 * minFreq }
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

export class HistogramController extends Stacks.StacksController {
  static controllerId = `${controllerId}-histogram`

  static targets = ['svg']
  declare readonly svgTarget: SVGSVGElement

  private buckets: Bucket[] = []
  private logScale = false

  static afterLoad(identifier: string): void {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<style id="${identifier}-styles">${histogramStyles}</style>`
    )
  }

  connect() {
    this.svgTarget.addEventListener(
      'click',
      this.propagateEvent.bind(this) as typeof this.propagateEvent
    )
    this.svgTarget.addEventListener(
      'pointerover',
      this.propagateEvent.bind(this) as typeof this.propagateEvent
    )
  }

  disconnect() {
    this.svgTarget.removeEventListener(
      'click',
      this.propagateEvent.bind(this) as typeof this.propagateEvent
    )
    this.svgTarget.removeEventListener(
      'pointerover',
      this.propagateEvent.bind(this) as typeof this.propagateEvent
    )
  }

  private svgRatioCache: number
  private get svgRatio(): number {
    if (this.svgRatioCache === undefined) {
      for (const _ of ensureHasSize(this.svgTarget)) {
        const bounds = innerRect(this.svgTarget)
        this.svgRatioCache = bounds.height / bounds.width
      }
    }
    return this.svgRatioCache
  }

  private adjustThresholdClasses(threshold: number): void {
    this.svgTarget
      .querySelectorAll('.threshold')
      .forEach((rect) => rect.classList.remove('threshold'))
    this.svgTarget
      .querySelector(`rect[data-bucket-conn-count="${threshold}"]`)
      ?.classList.add('threshold')
  }

  private propagateEvent(e: Event): void {
    const bucketRect = (e.target as SVGElement | null)?.closest(
      'svg [data-bucket-index]'
    ) as SVGElement | null
    const indexStr = bucketRect?.dataset.bucketIndex
    if (indexStr === undefined) return
    const index = parseInt(indexStr)
    if (index < 0 || index >= this.buckets.length) return
    e.stopPropagation()

    const bucket = this.buckets[index]
    if (e.type === 'click') this.adjustThresholdClasses(bucket.connCount)

    this.dispatch(e.type, { detail: bucket })
  }

  setFrequencies(userFrequencies: UserFrequencies, dispatchEvent = true) {
    // first clear the existing histogram
    this.svgTarget.replaceChildren()

    const { buckets, logScale } = genHistogramBuckets(userFrequencies)
    this.buckets = buckets
    this.logScale = logScale

    // don't bother drawing when it's just zero or one bucket.
    if (buckets.length <= 1) return { buckets: [], logScale: false }

    this.drawBarChart()
    this.adjustThresholdClasses(this.buckets[0].connCount)
    if (dispatchEvent) this.dispatch('click', { detail: this.buckets[0] })
  }

  private drawBarChart() {
    const svgWidth =
      this.buckets.length * (histBarWidth + histBarSpacing) + histBarSpacing
    const svgHeight = svgWidth * this.svgRatio
    this.svgTarget.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`)

    // Bars are scaled to fit the available height; when using log10 scale
    // we do need to give bars with count 1 a minimum height (roughly half the
    // height of bars with count 2, as log10(1) is otherwise 0).
    const scaleHeight = this.logScale
      ? (y: number) => (y > 0 ? Math.log10(y) || 0.15 : y)
      : (y: number) => y
    const maxValue = Math.max(...this.buckets.map(({ userCount }) => userCount))
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
    const gridLines = this.svgTarget.querySelector('g.gridLines')!
    // grid line spacing differs when using log10 scale (going up by powers of 10)
    // and when using linear scale (drawing at most 10 such lines)
    const gridStep = this.logScale
      ? (y: number) => Math.pow(10, Math.floor(Math.log10(y || 1)))
      : (_: unknown, step = Math.max(Math.floor(maxValue / 10), 1)) => step
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
    this.buckets.forEach((bucket, index) => {
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
