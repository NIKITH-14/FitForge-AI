import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RecipeRecommendations from '@/components/dashboard/RecipeRecommendations';
import api from '@/lib/api';
import { AuthContext } from '@/lib/AuthContext';

// ── Mock the API client ───────────────────────────────────────────────────────
jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

// ── Mock react-hot-toast ──────────────────────────────────────────────────────
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    error:   jest.fn(),
    success: jest.fn(),
  }),
}));

// ── Shared mock data ──────────────────────────────────────────────────────────
const MOCK_RECIPE = {
  id: 1, title: 'Mock Chicken Salad', image: null,
  sourceUrl: 'https://spoonacular.com/mock', likes: 3,
  usedIngredientCount: 2, missedIngredientCount: 1,
  usedIngredients: ['chicken', 'tomato'],
  missedIngredients: ['lemon'],
};

// ── Auth context wrapper ──────────────────────────────────────────────────────
const mockProfile = {
  id: 'pro_1', user_id: 'u1', name: 'Test User',
  fitness_goal: 'muscle_gain', height: 175, weight: 70,
};

const renderComponent = () =>
  render(
    <AuthContext.Provider value={{
      user: { id: 'u1', name: 'Test', email: 'test@test.com' } as any,
      activeProfile: mockProfile as any,
      accountToken: 'mock_token',
      profileToken: 'mock_profile_token',
      loading: false,
      login: jest.fn(), register: jest.fn(),
      switchProfile: jest.fn(), fullLogout: jest.fn(), refreshUser: jest.fn(),
      setActiveProfile: jest.fn(), clearProfile: jest.fn(),
    }}>
      <RecipeRecommendations />
    </AuthContext.Provider>
  );

afterEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
describe('RecipeRecommendations — Manual Search', () => {
// ─────────────────────────────────────────────────────────────────────────────

  it('renders the manual search input and button', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/e\.g\. egg/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search Recipes/i })).toBeInTheDocument();
  });

  it('shows error toast when searching with empty input', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Search Recipes/i }));
    expect(require('react-hot-toast').default.error).toHaveBeenCalledWith('Please enter at least one ingredient.');
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('calls GET /recipes and renders cards on success', async () => {
    mockApi.get.mockResolvedValue({ data: { data: [MOCK_RECIPE], message: 'Found 1 recipe.' } });
    const user = userEvent.setup();
    renderComponent();
    await user.type(screen.getByPlaceholderText(/e\.g\. egg/i), 'chicken');
    await user.click(screen.getByRole('button', { name: /Search Recipes/i }));
    expect(await screen.findByText('Mock Chicken Salad')).toBeInTheDocument();
    expect(screen.getByText('1 found')).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledWith('/recipes', expect.objectContaining({ params: expect.objectContaining({ ingredients: 'chicken' }) }));
  });

  it('shows error message on API failure', async () => {
    mockApi.get.mockRejectedValue({ response: { data: { message: 'Server Error' } } });
    const user = userEvent.setup();
    renderComponent();
    await user.type(screen.getByPlaceholderText(/e\.g\. egg/i), 'test');
    await user.click(screen.getByRole('button', { name: /Search Recipes/i }));
    expect(await screen.findByText('Server Error')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('RecipeRecommendations — Excel Upload', () => {
// ─────────────────────────────────────────────────────────────────────────────

  it('renders the Excel upload tab and switches to it', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Upload Spreadsheet/i }));
    expect(screen.getByTestId('excel-drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('excel-file-input')).toBeInTheDocument();
  });

  it('accepts an xlsx file and shows the Extract button', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Upload Spreadsheet/i }));

    const file = new File([new ArrayBuffer(8)], 'grocery.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileInput = screen.getByTestId('excel-file-input');
    await user.upload(fileInput, file);

    expect(await screen.findByText('grocery.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extract.*Find Recipes/i })).toBeInTheDocument();
  });

  it('calls POST /recipes/from-excel, shows ingredient pills and recipe cards on success', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        ingredients: ['chicken', 'tomato', 'garlic'],
        recipes: [MOCK_RECIPE],
        message: 'Found 1 recipe from your grocery list.',
      },
    });

    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Upload Spreadsheet/i }));

    const file = new File([new ArrayBuffer(8)], 'grocery.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(screen.getByTestId('excel-file-input'), file);
    await user.click(screen.getByRole('button', { name: /Extract.*Find Recipes/i }));

    // Extracted ingredient pills
    expect(await screen.findByText('chicken')).toBeInTheDocument();
    expect(screen.getByText('tomato')).toBeInTheDocument();
    expect(screen.getByText('garlic')).toBeInTheDocument();

    // Recipe card
    expect(screen.getByText('Mock Chicken Salad')).toBeInTheDocument();
    expect(screen.getByText('1 found')).toBeInTheDocument();

    expect(mockApi.post).toHaveBeenCalledWith(
      expect.stringContaining('/recipes/from-excel'),
      expect.any(FormData),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }) })
    );
  });

  it('shows error message on API failure (e.g. missing Item column)', async () => {
    mockApi.post.mockRejectedValue({
      response: { status: 422, data: { message: 'Could not find an "Item" column' } },
    });

    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Upload Spreadsheet/i }));

    const file = new File([new ArrayBuffer(8)], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(screen.getByTestId('excel-file-input'), file);
    await user.click(screen.getByRole('button', { name: /Extract.*Find Recipes/i }));

    expect(await screen.findByText(/Could not find an "Item" column/i)).toBeInTheDocument();
  });

  it('shows loading state while extracting', async () => {
    // Never resolves during the assertion window
    mockApi.post.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Upload Spreadsheet/i }));

    const file = new File([new ArrayBuffer(8)], 'grocery.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(screen.getByTestId('excel-file-input'), file);
    await user.click(screen.getByRole('button', { name: /Extract.*Find Recipes/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Extracting…/i })).toBeDisabled();
    });
    // Skeleton shimmers should render
    expect(document.querySelectorAll('.shimmer').length).toBeGreaterThan(0);
  });
});
