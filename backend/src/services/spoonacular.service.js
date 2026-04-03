/**
 * spoonacular.service.js
 * Encapsulates all interactions with the Spoonacular API.
 */

const SPOONACULAR_BASE = 'https://api.spoonacular.com/recipes';

class SpoonacularService {
  /**
   * Fetch recipes based on provided ingredients.
   * @param {string[]} ingredients - Array of ingredient names.
   * @param {number} limit - Max number of recipes to return.
   * @param {string} apiKey - Spoonacular API Key.
   * @returns {Promise<Array>} - Array of raw recipe objects from the API.
   * @throws {Error} - Structured error compatible with Express error handlers.
   */
  async findByIngredients(ingredients, limit, apiKey) {
    if (!apiKey || apiKey === 'your_api_key_here') {
      const error = new Error('Recipe service is not configured. Please set SPOONACULAR_API_KEY in your environment.');
      error.statusCode = 503;
      throw error;
    }

    if (!ingredients || ingredients.length === 0) {
      const error = new Error('Please provide valid ingredient names.');
      error.statusCode = 400;
      throw error;
    }

    const params = new URLSearchParams({
      ingredients: ingredients.join(','),
      number: limit,
      ranking: 1, // 1 = maximise used ingredients
      ignorePantry: true,
      apiKey,
    });

    const url = `${SPOONACULAR_BASE}/findByIngredients?${params}`;

    const res = await fetch(url);

    if (res.status === 429) {
      const error = new Error('Spoonacular rate limit reached. Please try again in a moment.');
      error.statusCode = 429;
      throw error;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const error = new Error(`Spoonacular API error (${res.status}): ${body}`);
      error.statusCode = 502;
      throw error;
    }

    return res.json();
  }
}

module.exports = new SpoonacularService();
