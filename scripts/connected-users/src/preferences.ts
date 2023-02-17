import { controllerId } from './constants'
import { persisted } from './storage'
import { xrefUIStateDefaults } from './xrefIPAddresses/uiState'

const preferenceDefaults = {
  focusedUsers: [] as number[],
  xrefUIState: xrefUIStateDefaults,
}

export const [preferences, reload] = persisted(controllerId, preferenceDefaults)
