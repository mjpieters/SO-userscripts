/* global GM_addStyle */
import { userStyles } from './constants'
import { BookmarkersController } from './controller'

async function main() {
  GM_addStyle(userStyles)
  const bookmarksCount = document.querySelector<HTMLElement>('.js-bookmark-btn')
  BookmarkersController.attach(bookmarksCount)
}

main()
