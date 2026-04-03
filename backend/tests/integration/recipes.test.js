const request = require('supertest');
const app = require('../../src/app');
const { getMockTokens } = require('../utils/authHelper');
const spoonacularService = require('../../src/services/spoonacular.service');
const { mockSpoonacularResponse } = require('../utils/mockData');

// Mock the service layer completely so we never hit the real Spoonacular API
jest.mock('../../src/services/spoonacular.service');

describe('Recipes API Integration Tests', () => {
    let profileToken;

    beforeAll(() => {
        const tokens = getMockTokens();
        profileToken = tokens.profileToken;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/recipes', () => {
        it('should return 401 if missing authorization header', async () => {
            const res = await request(app).get('/api/recipes?ingredients=egg');
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Missing or invalid Profile authorization header');
        });

        it('should return 400 if ingredients query is missing', async () => {
            const res = await request(app)
                .get('/api/recipes')
                .set('Authorization', `Bearer ${profileToken}`);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toBe('Please provide at least one ingredient.');
        });

        it('should return 400 if ingredients query is malformed/empty', async () => {
            const res = await request(app)
                .get('/api/recipes?ingredients=,, ,')
                .set('Authorization', `Bearer ${profileToken}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Please provide valid ingredient names.');
        });

        it('should successfully return standard JSON structure on valid input (Happy Path)', async () => {
            // Mock service response
            spoonacularService.findByIngredients.mockResolvedValue(mockSpoonacularResponse);

            const res = await request(app)
                .get('/api/recipes?ingredients=egg,tomato&limit=5')
                .set('Authorization', `Bearer ${profileToken}`);

            // Assert Status & Service Called
            expect(res.statusCode).toBe(200);
            expect(spoonacularService.findByIngredients).toHaveBeenCalledTimes(1);
            expect(spoonacularService.findByIngredients).toHaveBeenCalledWith(
                ['egg', 'tomato'], 
                5, // limit
                expect.any(String) // apiKey from env
            );

            // Assert Standard Output Structure
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('meta');
            expect(res.body).toHaveProperty('data');
            
            // Validate Structure & Content of 'data' array
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(2);

            const firstRecipe = res.body.data[0];
            expect(firstRecipe).toHaveProperty('id', 123456);
            expect(firstRecipe).toHaveProperty('title', 'Egg Tomato Stir Fry');
            expect(firstRecipe).toHaveProperty('image', 'https://img.spoonacular.com/recipes/123456-312x231.jpg');
            expect(firstRecipe).toHaveProperty('sourceUrl');
            expect(firstRecipe).toHaveProperty('usedIngredientCount', 2);
            expect(firstRecipe).toHaveProperty('missedIngredientCount', 1);
            expect(Array.isArray(firstRecipe.usedIngredients)).toBe(true);
            expect(firstRecipe.usedIngredients).toContain('egg');
            expect(firstRecipe.missedIngredients).toContain('oil');
        });

        it('should limit recipes to maximum of 12 regardless of input', async () => {
            spoonacularService.findByIngredients.mockResolvedValue([]);

            await request(app)
                .get('/api/recipes?ingredients=egg&limit=50')
                .set('Authorization', `Bearer ${profileToken}`);

            expect(spoonacularService.findByIngredients).toHaveBeenCalledWith(
                ['egg'], 
                12, // Max limits applied
                expect.any(String)
            );
        });

        it('should return exactly structured empty state when no recipes found', async () => {
            spoonacularService.findByIngredients.mockResolvedValue([]);

            const res = await request(app)
                .get('/api/recipes?ingredients=dragonmeat')
                .set('Authorization', `Bearer ${profileToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
            expect(res.body.message).toMatch(/No recipes found/);
        });

        it('should handle Spoonacular service errors (502 / 429) gracefully', async () => {
            const mockError = new Error('Spoonacular rate limit reached');
            mockError.statusCode = 429;
            spoonacularService.findByIngredients.mockRejectedValue(mockError);

            const res = await request(app)
                .get('/api/recipes?ingredients=egg')
                .set('Authorization', `Bearer ${profileToken}`);

            expect(res.statusCode).toBe(429);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('rate limit');
        });
    });
});
