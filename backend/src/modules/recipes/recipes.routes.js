/**
 * recipes.routes.js
 * Mounts recipe endpoints under /api/recipes
 */

const express                             = require('express');
const router                              = express.Router();
const multer                              = require('multer');
const { getRecipesByIngredients, getRecipesFromExcel } = require('./recipes.controller');
const { authenticateProfile }             = require('../../middleware/auth');

// ─── Multer: memory storage, 10MB, Excel/CSV only ────────────────────────────
const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      const err = new Error('Only .xlsx, .xls, and .csv files are accepted.');
      err.statusCode = 400;
      err.expose = true;
      cb(err);
    }
  },
});

// GET  /api/recipes?ingredients=egg,tomato[&limit=10][&goal=weight_loss]
router.get('/', authenticateProfile, getRecipesByIngredients);

// POST /api/recipes/from-excel  (multipart/form-data field: "file")
router.post('/from-excel', authenticateProfile, upload.single('file'), getRecipesFromExcel);

module.exports = router;
