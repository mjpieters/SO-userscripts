import { describe, expect, jest, test } from '@jest/globals'

import { cartesian } from '../testUtils'
import { DeletedUser, ExistingUser } from '@connected-users/users/classes'

jest.spyOn(window, 'location', 'get').mockReturnValue({
  origin: 'https://example.com',
} as unknown as Location)

describe('Users are rendered to HTML', () => {
  const baseUserData = {
    user_id: 42,
    badge_counts: {
      bronze: 3,
      silver: 2,
      gold: 1,
    },
    display_name: 'Test User <script>alert("XSS")</script>',
    profile_image: 'https://images.example.com/test-user.png',
  }

  const links = [
    'https://example.com/users/42/test-user',
    'https://othersite.example.com/users/42/test-user',
  ]
  const reps = [1, 1234, 17424, 4321432]
  const userTypes = ['unregistered', 'registered', 'moderator', 'team_admin']
  const isEmployees = [false, true]
  const cases = cartesian([links, reps, userTypes, isEmployees])

  test.each(cases)(
    'reflecting link %s, reputation %i, user type %s, and is_employee %s',
    (link, reputation, userType, isEmployee) => {
      const user = Object.assign(new ExistingUser(), {
        ...baseUserData,
        link,
        reputation,
        user_type: userType,
        is_employee: isEmployee,
      })
      expect(user.node).toMatchSnapshot()
    }
  )
})

test('Deleted user can rendered to HTML', () => {
  const deletedUser = new DeletedUser(42)
  expect(deletedUser.node).toMatchSnapshot()
})
