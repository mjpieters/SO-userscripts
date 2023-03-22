import { describe, expect, test } from '@jest/globals'

import { cartesian } from '../testUtils'
import { DeletedUser, User } from '../../src/users/classes'

describe('Users are rendered to HTML', () => {
  const baseUserData = {
    user_id: 42,
    badge_counts: {
      bronze: 3,
      silver: 2,
      gold: 1,
    },
    display_name: 'Test User <script>alert("XSS")</script>',
    link: 'https://example.com/users/42/test-user',
    profile_image: 'https://images.example.com/test-user.png',
  }

  const reps = [1, 1234, 17424, 4321432]
  const userTypes = ['unregistered', 'registered', 'moderator', 'team_admin']
  const isEmployees = [false, true]
  const cases = cartesian([reps, userTypes, isEmployees])

  test.each(cases)(
    'reflecting reputation %i, user type %s, and is_employee %s',
    (reputation, userType, isEmployee) => {
      const user = Object.assign(new User(), {
        ...baseUserData,
        reputation,
        user_type: userType,
        is_employee: isEmployee,
      })
      expect(user.toHTML()).toMatchSnapshot()
    }
  )
})

test('Deleted user can rendered to HTML', () => {
  const deletedUser = Object.assign(new DeletedUser(42))
  expect(deletedUser.toHTML()).toMatchSnapshot()
})
