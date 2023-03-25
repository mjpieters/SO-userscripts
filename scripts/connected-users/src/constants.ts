export const luxonUrl =
  'https://cdn.jsdelivr.net/npm/luxon@3/build/global/luxon.min.js'

export const controllerId = 'us-mod-connected-users'

// These are arbitrary units, the viewbox is calculated from these
export const histBarSpacing = 1
export const histBarWidth = 4
export const maxhistBars = 20
export const gridLineHeightRatio = 0.005

// API key specific to this script, client id 25514
export const seAPIKey = 'rSgJSoND0c32iHgumlM8vg(('
export const seAPIURL = 'https://api.stackexchange.com/2.3'
/*
 * Minimal subset for user queries, containing only:
 *   wrapper (backoff, error_id, error_message, error_name, items, quota_max, quota_remaining),
 *   badge_count (bronze, silver, gold),
 *   user (badge_counts, display_name, is_employee, link, profile_image, reputation, user_id, user_type)
 * unsafe is true, to work around https://meta.stackexchange.com/q/387761; the display_name field will
 * need to be sanitized!
 */
export const minimalUserFilter = ')Q7.NL.wLaTOvZyxvEF8za4m(g8T'
export const userAPICacheSize = 1000
