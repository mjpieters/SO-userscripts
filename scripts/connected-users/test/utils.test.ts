import { describe, expect, test } from '@jest/globals'

import { escapeHtml } from '../src/utils'

describe('We can safely escape text for use in HTML', () => {
  const tests = [
    {
      text: 'This is a test of the emergency broadcasting system.',
      expected: 'This is a test of the emergency broadcasting system.',
    },
    {
      text: '<script src=\'#&amp;\'>alert("XSS")</script>',
      expected:
        '&lt;script src=&#039;#&amp;amp;&#039;&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    },
  ]
  test.each(tests)('$#: $text => $expected', ({ text, expected }) => {
    const escaped = escapeHtml(text)
    expect(escaped).toBe(expected)
  })
})
