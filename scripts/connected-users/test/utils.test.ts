import { describe, expect, test } from '@jest/globals'

import { camelize, escapeHtml } from '../src/utils'

describe('We can turn kebab-case into camelCase', () => {
  const tests = [
    { text: 'foo-bar-baz', expected: 'fooBarBaz' },
    { text: 'foobar', expected: 'foobar' },
    { text: 'underscore_case', expected: 'underscoreCase' },
    { text: 'numbered-1-2-3', expected: 'numbered123' },
  ]
  test.each(tests)('$#: $text => $expected', ({ text, expected }) => {
    const camelized = camelize(text)
    expect(camelized).toBe(expected)
  })
})

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
