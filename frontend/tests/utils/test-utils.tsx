import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthContext } from '@/lib/AuthContext';

const mockProfile = {
  id: 'profile_xyz123',
  user_id: 'user_xyz123',
  name: 'Test Tester',
  avatar_emoji: '🏋️',
  fitness_goal: 'muscle_gain',
  is_guest: false,
  has_completed_onboarding: true
};

const mockAuthContextValue = {
  activeProfile: mockProfile,
  profileToken: 'fake_token',
  loading: false,
  fullLogout: jest.fn(),
  switchProfile: jest.fn(),
};

/**
 * Creates a custom test render function that wraps the component
 * in the application's Auth Context with predefined mock data.
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(
    <AuthContext.Provider value={mockAuthContextValue as any}>
      {ui}
    </AuthContext.Provider>,
    options
  );
};

export * from '@testing-library/react';
export { customRender as render, mockProfile, mockAuthContextValue };
