import { describe, beforeEach, expect, test } from '@jest/globals'

import * as Stimulus from '@hotwired/stimulus'

import { domReady } from './testUtils'
import { EmptyDomController } from '@connected-users/emptyDom'

describe('We can use an EmptyDomController to watch for container changes', () => {
  const controllerId = EmptyDomController.controllerId
  let application: Stimulus.Application

  beforeEach(async () => {
    application = Stimulus.Application.start()
    application.register(controllerId, EmptyDomController)
  })

  const createController = async (
    html: string
  ): Promise<EmptyDomController> => {
    document.body.innerHTML = html
    const elem = document.body.firstElementChild as HTMLElement
    elem.dataset.controller = controllerId

    // wait for the controller to be connected, which happens on domReady
    await domReady()
    return application.getControllerForElementAndIdentifier(
      elem,
      controllerId
    ) as EmptyDomController
  }

  test('starting with an empty container, classes are set immediately', async () => {
    const controller = await createController(`
      <div class="existing"
        data-${controllerId}-empty-class="emptyContainer foo"
        data-${controllerId}-not-empty-class="notEmptyContainer bar">
      </div>
    `)
    expect(controller.element.className.split(/ +/).sort()).toStrictEqual([
      'emptyContainer',
      'existing',
      'foo',
    ])
  })

  test('starting with elements in the container, classes are set immediately', async () => {
    const controller = await createController(`
      <div class="existing"
        data-${controllerId}-empty-class="emptyContainer foo"
        data-${controllerId}-not-empty-class="notEmptyContainer bar">
        <div></div>
      </div>
    `)
    expect(controller.element.className.split(/ +/).sort()).toStrictEqual([
      'bar',
      'existing',
      'notEmptyContainer',
    ])
  })

  test('adding an element to the container, classes are set', async () => {
    const controller = await createController(`
      <div
        data-${controllerId}-empty-class="emptyContainer"
        data-${controllerId}-not-empty-class="notEmptyContainer">
      </div>
    `)
    controller.element.innerHTML = '<div/>'
    // allow async processes to run
    await Promise.resolve()
    expect(controller.element.className.split(/ +/).sort()).toStrictEqual([
      'notEmptyContainer',
    ])
  })

  test('Emptying the container, classes are set', async () => {
    const controller = await createController(`
      <div
        data-${controllerId}-empty-class="emptyContainer"
        data-${controllerId}-not-empty-class="notEmptyContainer">
        <div></div>
      </div>
    `)
    controller.element.innerHTML = ''
    // allow async processes to run
    await Promise.resolve()
    expect(controller.element.className.split(/ +/).sort()).toStrictEqual([
      'emptyContainer',
    ])
  })

  test('adding elements fires an event, with the number of child nodes present', async () => {
    const controller = await createController('<div></div>')
    let eventCount: number | null = null
    controller.element.addEventListener(
      `${controllerId}:not-empty`,
      (e: CustomEvent<{ count: number }>) => {
        eventCount = e.detail.count
      }
    )

    controller.element.innerHTML = '<div></div><div></div><div></div>'
    await Promise.resolve()
    expect(eventCount).toStrictEqual(3)
  })

  test('emptying the container fires an event', async () => {
    const controller = await createController('<div><p></p></div>')
    let eventFired = false
    controller.element.addEventListener(`${controllerId}:empty`, () => {
      eventFired = true
    })

    controller.element.innerHTML = ''
    await Promise.resolve()
    expect(eventFired).toBe(true)
  })

  test('you can target a nested container rather than the controller element', async () => {
    const controller = await createController(`
      <div data-${controllerId}-not-empty-class="fired">
        <div data-${controllerId}-target="container" id="innerContainer">
        </div>
      </div>
    `)
    const inner = controller.element.querySelector(
      '#innerContainer'
    ) as HTMLElement

    controller.element.insertAdjacentHTML('afterbegin', '<p>Not monitored</p>')
    await Promise.resolve()
    expect(controller.element.className).toBe('')

    inner.insertAdjacentHTML('afterbegin', '<p>Monitored</p>')
    await Promise.resolve()
    expect(controller.element.className).toBe('fired')
  })

  test('you can use a selector to watch for specific children of the container', async () => {
    const controller = await createController(`
      <div data-${controllerId}-scope-selector-value=".selected"
           data-${controllerId}-not-empty-class="fired">
      </div>
    `)

    controller.element.insertAdjacentHTML('afterbegin', '<p>Not monitored</p>')
    await Promise.resolve()
    expect(controller.element.className).toBe('')

    controller.element.insertAdjacentHTML(
      'afterbegin',
      '<p class="selected">Monitored</p>'
    )
    await Promise.resolve()
    expect(controller.element.className).toBe('fired')
  })
})
