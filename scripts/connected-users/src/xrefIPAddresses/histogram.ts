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
    this.svgTarget.addEventListener('click', this.propagateEvent.bind(this))
    this.svgTarget.addEventListener('hover', this.propagateEvent.bind(this))
  }

  disconnect() {
    this.svgTarget.removeEventListener('click', this.propagateEvent.bind(this))
    this.svgTarget.removeEventListener('hover', this.propagateEvent.bind(this))
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
    const target = e.target as SVGRectElement
    const index = target.dataset.bucketIndex
    if (index === undefined) return

    const bucket = this.buckets[parseInt(index)]
    if (e.type === 'click') this.adjustThresholdClasses(bucket.connCount)

    this.dispatch(e.type, { detail: bucket })
  }

  setFrequencies(userFrequencies: UserFrequencies, dispatchEvent = true) {
    // first clear the existing histogram
    this.svgTarget.replaceChildren()
    this.buckets = []
    if (userFrequencies.length === 0) return

    const minConnCount = userFrequencies[userFrequencies.length - 1].count
    const maxConnCount = userFrequencies[0].count
    for (let i = minConnCount; i <= maxConnCount; i++) {
      this.buckets.push({
        connCount: i,
        userCount: 0,
        label: `Overlapping on ${i} ip(s)`,
      })
    }
    userFrequencies.forEach(
      ({ count }) => (this.buckets[count - minConnCount].userCount += 1)
    )

    if (this.buckets.length > maxhistBars) {
      // combine buckets to keep the histogram manageable when there are
      // a large number of IP addresses.
      const bucketCount = Math.ceil(this.buckets.length / maxhistBars)
      const newBuckets: Bucket[] = []
      for (let i = 0; i < this.buckets.length; i += bucketCount) {
        const connCount = this.buckets[i].connCount
        const lastConnCount =
          this.buckets[Math.min(this.buckets.length, i + bucketCount) - 1]
            .connCount
        const userCount = this.buckets
          .slice(i, i + bucketCount)
          .reduce((acc, { userCount }) => acc + userCount, 0)
        newBuckets.push({
          connCount,
          userCount,
          label:
            connCount !== lastConnCount
              ? `Overlapping ${connCount}-${lastConnCount} ip(s)`
              : `Overlapping ${connCount} ip(s)`,
        })
      }
      this.buckets = newBuckets
    }

    // lowest and highest non-zero frequencies
    const [minFreq, maxFreq] = this.buckets.reduce(
      ([min, max], { userCount }) => [
        Math.min(min, Math.max(userCount, 1)),
        Math.max(max, userCount),
      ],
      [Infinity, 1]
    )
    this.logScale = maxFreq > 10 * minFreq

    // don't bother when it's just one bucket or fewer.
    if (this.buckets.length <= 1) return

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
    const gridLines = this.svgTarget.querySelector('g.gridLines') as SVGGElement
    // grid line spacing differs when using log10 scale (going up by powers of 10)
    // and when using linear scale (drawing at most 10 such lines)
    const gridStep = this.logScale
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
