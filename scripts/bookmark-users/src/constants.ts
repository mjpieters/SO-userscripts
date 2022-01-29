// API key specific to this script, client id
export const seApiKey = '9VvY5KWke5mKcflYkx)NDw(('
export const seApiUrl = 'https://api.stackexchange.com/2.3'
/*
 * Minimal subset for user queries, containing only:
 *   wrapper (backoff, error_id, error_message_, error_name, items, quota_max, quota_remaining),
 *   user (display_name, is_employee, link, profile_image, reputation, user_id, user_type)
 */
export const minimalUserFilter = '!)69QNaSIc2a*QW(ccD0ph0dVbliY'
export const sedeUrl = 'https://data.stackexchange.com/'
// Query link: https://data.stackexchange.com/stackoverflow/query/1549808
// The ID here is that of the _revision_ of the query.
export const sedeQueryId = '1894927'

export const controllerId = 'us-bookmarkers'

// scale anonymous gravatar sprite in stacks minimal usercard style
export const userStyles = `
.${controllerId}-content { min-height: min-content; }
.${controllerId}-popover .s-user-card__minimal .anonymous-gravatar {
  zoom:0.5;
  -moz-transform:scale(0.5);
  -moz-transform-origin: 0 0;
}
.${controllerId}-popover .s-user-card__minimal .s-user-card--time {
  font-variant-numeric: tabular-nums;
}
`
