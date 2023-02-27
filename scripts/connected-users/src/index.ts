/* global Stacks, StackExchange */
import { controllerId } from './constants'
import { xrefUsersView } from './views'

if (new URL(location.href).searchParams.has('usModDebug')) {
  Stacks.application.debug = true
}

Stacks.application.logDebugActivity(controllerId, 'pre-flight', {
  isModerator: StackExchange.options.user.isModerator,
})
if (StackExchange.options.user.isModerator) {
  xrefUsersView()
}
