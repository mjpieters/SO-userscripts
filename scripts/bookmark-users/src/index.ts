/* global GM_addStyle, StackExchange */
import { userStyles } from './constants'
import { BookmarkersController } from './controller'

StackExchange.ready(() => {
  GM_addStyle(userStyles)
  const bookmarksCount = document.querySelector<HTMLElement>('.js-bookmark-btn')
  BookmarkersController.attach(bookmarksCount)
})
