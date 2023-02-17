import { controllerId } from '../constants'
export const xrefUIStateDefaults = {
  openedSections: {
    [`${controllerId}-connected-histogram`]: true,
    [`${controllerId}-connected`]: false,
    [`${controllerId}-focused`]: false,
  },
  showOnlyConnected: false,
}
