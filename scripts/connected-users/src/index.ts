/* global StackExchange */
import { xrefUsersView } from './views'

if (StackExchange.options.user.isModerator) {
  xrefUsersView()
}
