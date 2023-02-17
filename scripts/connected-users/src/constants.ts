export const luxonUrl =
  'https://cdn.jsdelivr.net/npm/luxon@3/build/global/luxon.min.js'

export const controllerId = 'us-mod-connected-users'

// These are arbitrary units, the viewbox is calculated from these
export const histBarSpacing = 1
export const histBarWidth = 4
export const maxhistBars = 20
export const gridLineHeightRatio = 0.005

// API key specific to this script, client id 25514
export const seApiKey = 'rSgJSoND0c32iHgumlM8vg(('
export const seApiUrl = 'https://api.stackexchange.com/2.3'
/*
 * Minimal subset for user queries, containing only:
 *   wrapper (backoff, error_id, error_message, error_name, items, quota_max, quota_remaining),
 *   badge_count (bronze, silver, gold),
 *   user (badge_counts, display_name, is_employee, link, profile_image, reputation, user_id, user_type)
 */
export const minimalUserFilter = '!ACgHDY30sZUf7hsfwUhuaGWzjM9W8F5'
export const userAPICacheSize = 1000
