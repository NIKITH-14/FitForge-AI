/**
 * recipes.controller.js
 * Handles recipe recommendations via the Spoonacular API Service.
 * GET  /api/recipes?ingredients=egg,tomato[&goal=weight_loss][&limit=10]
 * POST /api/recipes/from-excel  (multipart .xlsx or .csv upload)
 */

const spoonacularService = require('../../services/spoonacular.service');
const excelParser        = require('../../services/excelParser.service');

// ─── Goal → hint map ──────────────────────────────────────────────────────────
const GOAL_DIET_MAP = {
  weight_loss:    { diet: 'low-calorie' },
  muscle_gain:    { minProtein: 30 },
  maintain:       {},
  improve_health: { diet: 'whole30' },
};

// ─── Allowed MIME types for Excel/CSV upload ──────────────────────────────────
const ALLOWED_EXCEL_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',  // .xls
  'text/csv',                  // .csv
  'application/csv',
]);

/**
 * Shared helper: fetch & shape recipes from Spoonacular.
 */
const fetchAndShapeRecipes = async (ingredients, limit, goal, apiKey) => {
  const recipes = await spoonacularService.findByIngredients(ingredients, limit, apiKey);

  if (!Array.isArray(recipes) || recipes.length === 0) {
    return { data: [], goalTag: '' };
  }

  const data = recipes.map((r) => ({
    id:                   r.id,
    title:                r.title,
    image:                r.image || null,
    sourceUrl:            `https://spoonacular.com/recipes/${(r.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${r.id}`,
    usedIngredientCount:  r.usedIngredientCount  ?? 0,
    missedIngredientCount: r.missedIngredientCount ?? 0,
    usedIngredients:      (r.usedIngredients  || []).map((i) => i.name),
    missedIngredients:    (r.missedIngredients || []).map((i) => i.name),
    likes:                r.likes ?? 0,
  }));

  const hint    = GOAL_DIET_MAP[goal];
  const goalTag = hint?.diet ? ` (filtered for: ${hint.diet})` : '';
  return { data, goalTag };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/recipes?ingredients=egg,tomato[&limit=10][&goal=weight_loss]
// ─────────────────────────────────────────────────────────────────────────────
const getRecipesByIngredients = async (req, res, next) => {
  try {
    const rawIngredients = (req.query.ingredients || '').trim();
    if (!rawIngredients) {
      return res.status(400).json({ success: false, data: [], message: 'Please provide at least one ingredient.' });
    }

    const ingredients = rawIngredients.split(',').map((i) => i.trim().toLowerCase()).filter(Boolean);
    if (ingredients.length === 0) {
      return res.status(400).json({ success: false, data: [], message: 'Please provide valid ingredient names.' });
    }

    const limit  = Math.min(Number(req.query.limit) || 10, 12);
    const goal   = req.query.goal || req.user?.fitness_goal || 'maintain';
    const apiKey = process.env.SPOONACULAR_API_KEY;

    const { data, goalTag } = await fetchAndShapeRecipes(ingredients, limit, goal, apiKey);

    if (data.length === 0) {
      return res.json({ success: true, data: [], message: `No recipes found for: ${ingredients.join(', ')}. Try different ingredients.` });
    }

    return res.json({
      success: true,
      data,
      message: `Found ${data.length} recipe${data.length !== 1 ? 's' : ''}${goalTag}.`,
      meta: { ingredientsUsed: ingredients, goal, count: data.length },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, data: [], message: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/recipes/from-excel
// Accepts multipart/form-data with field "file" (.xlsx or .csv)
// ─────────────────────────────────────────────────────────────────────────────
const getRecipesFromExcel = async (req, res, next) => {
  try {
    // ── 1. File presence & MIME validation ────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Please attach an .xlsx or .csv file.' });
    }

    if (!ALLOWED_EXCEL_MIME.has(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type "${req.file.mimetype}". Please upload an .xlsx or .csv file.`,
      });
    }

    // ── 2. Parse ingredients from Excel/CSV ───────────────────────────────
    const ingredients = excelParser.parseIngredients(req.file.buffer, req.file.mimetype);

    // ── 3. Fetch recipes ───────────────────────────────────────────────────
    const limit  = Math.min(Number(req.query.limit) || 10, 12);
    const goal   = req.query.goal || req.user?.fitness_goal || 'maintain';
    const apiKey = process.env.SPOONACULAR_API_KEY;

    const { data, goalTag } = await fetchAndShapeRecipes(ingredients, limit, goal, apiKey);

    return res.json({
      success: true,
      ingredients,
      recipes: data,
      message: data.length > 0
        ? `Found ${data.length} recipe${data.length !== 1 ? 's' : ''} from your grocery list${goalTag}.`
        : 'No recipes found for the extracted ingredients. Try adding more common grocery items.',
      meta: { ingredientsUsed: ingredients, goal, count: data.length },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

module.exports = { getRecipesByIngredients, getRecipesFromExcel };
