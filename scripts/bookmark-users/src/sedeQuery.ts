/*
 * Query the Stack Exchange Data Explorer for user ids of users who bookmarked a post
 * Uses the GM_xmlhttpRequest function + a @connect registration to get around CORS
 * limitations on that host.
 */
import { sedeUrl, sedeQueryId } from './constants'
import { getSiteId } from './utils'

type BookmarkedBy = {
  date: string
  userId: string
}

export function fetchBookmarkers(postId: number): Promise<BookmarkedBy[]> {
  const siteId = getSiteId()
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `${sedeUrl}/${siteId}/csv/${sedeQueryId}?postId=${postId}`,
      fetch: true,
      onload: (response) => {
        if (response.status !== 200) {
          reject(new Error(`invalid response ${response}`))
        }
        const text = response.responseText
        const lines = text.split(/\r?\n/).filter(Boolean)
        lines.shift() // remove the header
        resolve(
          lines.map((line: string) => {
            // date in YYYY-MM-DD 00:00:00 format, userId, both quoted
            const [dateStr, userId] = line.replaceAll('"', '').split(',')
            const date = dateStr.split(' ')[0]
            return { date, userId }
          })
        )
      },
    })
  })
}
