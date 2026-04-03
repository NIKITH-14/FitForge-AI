const request = require('supertest');
const path    = require('path');
const fs      = require('fs');
const app     = require('../../src/app');
const { getMockTokens } = require('../utils/authHelper');
const spoonacularService = require('../../src/services/spoonacular.service');
const { mockSpoonacularResponse } = require('../utils/mockData');

// ── Mock the Spoonacular service — never hit the real API in tests ──────────
jest.mock('../../src/services/spoonacular.service');

// ── Fixture paths ─────────────────────────────────────────────────────────────
const FIXTURES = {
  valid:          path.join(__dirname, '../utils/valid.xlsx'),
  invalidColumn:  path.join(__dirname, '../utils/invalid_column.xlsx'),
  empty:          path.join(__dirname, '../utils/empty.xlsx'),
};

describe('POST /api/recipes/from-excel', () => {
  let profileToken;

  beforeAll(() => {
    const tokens = getMockTokens();
    profileToken = tokens.profileToken;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Security ────────────────────────────────────────────────────────────────
  it('should return 401 with no Authorization header', async () => {
    const res = await request(app)
      .post('/api/recipes/from-excel')
      .attach('file', Buffer.from(''), 'test.xlsx');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  // ── Input validation ────────────────────────────────────────────────────────
  it('should return 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No file uploaded/i);
  });

  it('should return 400 when an unsupported file type (.txt) is uploaded', async () => {
    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`)
      .attach('file', Buffer.from('hello'), 'grocery.txt');

    expect(res.statusCode).toBe(400);
    // Multer fileFilter rejects it before controller runs, so it hits the global errorHandler
    expect(res.body).toHaveProperty('error');
  });

  it('should return 422 when Excel file is missing the "Item" column', async () => {
    const fileBuffer = fs.readFileSync(FIXTURES.invalidColumn);

    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`)
      .attach('file', fileBuffer, { filename: 'invalid_column.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/"Item" column/i);
  });

  it('should return 422 when Excel file has the "Item" column but no data rows', async () => {
    const fileBuffer = fs.readFileSync(FIXTURES.empty);

    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`)
      .attach('file', fileBuffer, { filename: 'empty.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/empty|No ingredients/i);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────
  it('should return 200 with extracted ingredients and recipes for a valid Excel file', async () => {
    spoonacularService.findByIngredients.mockResolvedValue(mockSpoonacularResponse);

    const fileBuffer = fs.readFileSync(FIXTURES.valid);

    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`)
      .attach('file', fileBuffer, { filename: 'valid.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // ── Status ────────────────────────────────────────
    expect(res.statusCode).toBe(200);

    // ── Response structure ────────────────────────────
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('ingredients');
    expect(res.body).toHaveProperty('recipes');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('meta');

    // ── Ingredients array ─────────────────────────────
    expect(Array.isArray(res.body.ingredients)).toBe(true);
    expect(res.body.ingredients.length).toBeGreaterThan(0);
    // Parser lowercases everything
    expect(res.body.ingredients).toContain('chicken');
    expect(res.body.ingredients).toContain('tomato');

    // ── Recipes array ─────────────────────────────────
    expect(Array.isArray(res.body.recipes)).toBe(true);
    const firstRecipe = res.body.recipes[0];
    expect(firstRecipe).toHaveProperty('id');
    expect(firstRecipe).toHaveProperty('title');
    expect(firstRecipe).toHaveProperty('sourceUrl');
    expect(firstRecipe).toHaveProperty('usedIngredientCount');
    expect(firstRecipe).toHaveProperty('missedIngredientCount');
    expect(Array.isArray(firstRecipe.usedIngredients)).toBe(true);
    expect(Array.isArray(firstRecipe.missedIngredients)).toBe(true);

    // ── Spoonacular was called with correct args ───────
    expect(spoonacularService.findByIngredients).toHaveBeenCalledTimes(1);
    expect(spoonacularService.findByIngredients).toHaveBeenCalledWith(
      expect.arrayContaining(['chicken', 'tomato', 'garlic']),
      expect.any(Number),
      expect.any(String)
    );

    // ── Meta ──────────────────────────────────────────
    expect(res.body.meta).toHaveProperty('ingredientsUsed');
    expect(res.body.meta).toHaveProperty('count');
  });

  it('should return success:true with empty recipes array when Spoonacular finds nothing', async () => {
    spoonacularService.findByIngredients.mockResolvedValue([]);

    const fileBuffer = fs.readFileSync(FIXTURES.valid);

    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`)
      .attach('file', fileBuffer, { filename: 'valid.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recipes).toEqual([]);
    expect(res.body.message).toMatch(/No recipes found/i);
  });

  it('should handle Spoonacular 429 rate-limit gracefully', async () => {
    const mockErr = new Error('Rate limit reached.');
    mockErr.statusCode = 429;
    spoonacularService.findByIngredients.mockRejectedValue(mockErr);

    const fileBuffer = fs.readFileSync(FIXTURES.valid);

    const res = await request(app)
      .post('/api/recipes/from-excel')
      .set('Authorization', `Bearer ${profileToken}`)
      .attach('file', fileBuffer, { filename: 'valid.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(res.statusCode).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Rate limit/i);
  });
});
