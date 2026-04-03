import { test, expect } from '@playwright/test';
import path from 'path';

// Path to the valid fixture (relative from the e2e/ directory root)
const VALID_EXCEL   = path.resolve(__dirname, '../../backend/tests/utils/valid.xlsx');
const INVALID_EXCEL = path.resolve(__dirname, '../../backend/tests/utils/invalid_column.xlsx');

test.describe('Recipe Recommendations — Excel Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Inject mock auth tokens before navigation
    await page.addInitScript(() => {
      window.localStorage.setItem('accessToken',   'mock_access_token');
      window.localStorage.setItem('profileToken',  'mock_profile_token');
      window.localStorage.setItem('activeProfile', JSON.stringify({
        id:           'pro_123',
        user_id:      'test_user',
        name:         'Test Profile',
        fitness_goal: 'muscle_gain',
      }));
    });

    await page.goto('/dashboard/pro_123');
    await expect(page.getByText('Recipe Finder')).toBeVisible();

    // Switch to Excel tab
    await page.getByRole('button', { name: /Upload Spreadsheet/i }).click();
    await expect(page.getByTestId('excel-drop-zone')).toBeVisible();
  });

  // ── Case 1: Valid Excel upload → ingredients + recipes displayed ──────────
  test('uploads a valid Excel file and displays extracted ingredients and recipes', async ({ page }) => {
    // Intercept the from-excel endpoint
    await page.route('**/api/recipes/from-excel**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          ingredients: ['chicken', 'tomato', 'garlic', 'spinach', 'olive oil'],
          recipes: [{
            id: 42, title: 'E2E Chicken Salad', image: null,
            sourceUrl: 'https://spoonacular.com/e2e-42',
            likes: 10,
            usedIngredientCount: 3, missedIngredientCount: 1,
            usedIngredients: ['chicken', 'tomato', 'garlic'],
            missedIngredients: ['lemon'],
          }],
          message: 'Found 1 recipe from your grocery list.',
          meta: { ingredientsUsed: ['chicken', 'tomato'], goal: 'muscle_gain', count: 1 },
        }),
      });
    });

    // Upload the valid fixture file
    const fileInput = page.getByTestId('excel-file-input');
    await fileInput.setInputFiles(VALID_EXCEL);

    // File preview row should appear
    await expect(page.getByText('valid.xlsx')).toBeVisible();

    // Click "Extract & Find Recipes"
    await page.getByRole('button', { name: /Extract.*Find Recipes/i }).click();

    // ── Ingredient pills ───────────────────────────────────────────────────
    await expect(page.getByText('chicken')).toBeVisible();
    await expect(page.getByText('tomato')).toBeVisible();
    await expect(page.getByText('garlic')).toBeVisible();

    // ── Recipe card ────────────────────────────────────────────────────────
    await expect(page.getByText('E2E Chicken Salad')).toBeVisible();
    await expect(page.getByText('1 found')).toBeVisible();
  });

  // ── Case 2: Invalid file (wrong extension) → error shown ────────────────
  test('shows an error when uploading a .txt file', async ({ page }) => {
    // Upload a non-spreadsheet file via the hidden input
    const fileInput = page.getByTestId('excel-file-input');
    await fileInput.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    });

    // The frontend validation should fire without calling the API
    // React-hot-toast renders with role="status"
    const toast = page.getByRole('status').filter({ hasText: /xlsx|xls|csv/i });
    await expect(toast).toBeVisible();
  });

  // ── Case 3: Missing "Item" column → backend error shown in UI ────────────
  test('shows backend error when spreadsheet has no Item column', async ({ page }) => {
    await page.route('**/api/recipes/from-excel**', async route => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Could not find an "Item" column in the spreadsheet. Found columns: Product, Cost',
        }),
      });
    });

    const fileInput = page.getByTestId('excel-file-input');
    await fileInput.setInputFiles(INVALID_EXCEL);

    await page.getByRole('button', { name: /Extract.*Find Recipes/i }).click();

    await expect(page.getByText(/"Item" column/i)).toBeVisible();
    // No recipe cards should be shown
    await expect(page.getByText(/found/i)).not.toBeVisible();
  });

  // ── Case 4: Loading state visible during extraction ──────────────────────
  test('shows loading state during file extraction', async ({ page }) => {
    // Never resolve — test the intermediate loading state
    await page.route('**/api/recipes/from-excel**', async route => {
      await new Promise(r => setTimeout(r, 2000)); // 2s delay
      await route.fulfill({ status: 200, json: { success: true, ingredients: [], recipes: [], message: '' } });
    });

    const fileInput = page.getByTestId('excel-file-input');
    await fileInput.setInputFiles(VALID_EXCEL);

    await page.getByRole('button', { name: /Extract.*Find Recipes/i }).click();

    // Button should now show loading state and be disabled
    const loadingBtn = page.getByRole('button', { name: /Extracting…/i });
    await expect(loadingBtn).toBeVisible();
    await expect(loadingBtn).toBeDisabled();

    // Shimmer skeletons should be visible
    await expect(page.locator('.shimmer').first()).toBeVisible();
  });
});
