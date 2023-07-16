/* global Stacks */
import { controllerId, luxonUrl } from './constants'
import { documentReady, loadScript } from './utils'
import { XRefConnectedUsersController } from './xrefIPAddresses/controller'

/**
 * Add extra UI to the IP address cross reference view for users and
 * highlight connected users.
 */
export function xrefUsersView(): void {
  Stacks.application.logDebugActivity(controllerId, 'xrefUsersView', {
    location: location.pathname,
  })
  if (!location.pathname.includes('/admin/xref-user-ips/')) return

  // eslint-disable-next-line no-void
  void Promise.all([documentReady, loadScript(luxonUrl)]).then(() => {
    XRefConnectedUsersController.attach('#xref-ids')
  })
}
