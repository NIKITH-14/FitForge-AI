// Global test setup / teardown if needed.
// E.g., loading env vars specifically for tests.
require('dotenv').config({ path: '.env.test' });

// We default to in-memory DB for tests, so we can ensure JWT secrets are deterministic.
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.SPOONACULAR_API_KEY = 'test_spoonacular_key';

afterAll(async () => {
    // Teardown logic
});
