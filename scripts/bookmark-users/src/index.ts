/* global StackExchange */
import { BookmarkersController } from './controller'

StackExchange.ready(() =>
  BookmarkersController.attach(document.querySelector('.js-bookmark-btn'))
)
