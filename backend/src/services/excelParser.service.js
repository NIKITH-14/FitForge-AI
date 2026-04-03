/**
 * excelParser.service.js
 * Parses an Excel (.xlsx) or CSV (.csv) file buffer and extracts ingredient names
 * from a column named "Item" (case-insensitive).
 *
 * Expected spreadsheet format:
 *   | Item         | Quantity | Price |
 *   |--------------|----------|-------|
 *   | Chicken      | 500g     | 2.99  |
 *   | Tomato       | 6 pcs    | 1.50  |
 *
 * The service only reads the "Item" column. All other columns are ignored.
 */

const XLSX = require('xlsx');

/**
 * @param {Buffer} fileBuffer   Raw file bytes from multer memory storage.
 * @param {string} mimeType     MIME type of the uploaded file.
 * @returns {string[]}          Deduplicated, lowercase, trimmed ingredient names.
 * @throws {Error}              Structured error with .statusCode for Express handlers.
 */
const parseIngredients = (fileBuffer, mimeType) => {
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch {
    const err = new Error('Unable to parse the uploaded file. Ensure it is a valid .xlsx or .csv file.');
    err.statusCode = 400;
    throw err;
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const err = new Error('The uploaded file contains no sheets.');
    err.statusCode = 400;
    throw err;
  }

  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON array (first row becomes keys)
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) {
    const err = new Error('The uploaded file is empty. Please add items to the spreadsheet.');
    err.statusCode = 422;
    throw err;
  }

  // Find the "Item" column key — case-insensitive match
  const sampleRow = rows[0];
  const itemKey = Object.keys(sampleRow).find(
    (k) => k.trim().toLowerCase() === 'item'
  );

  if (!itemKey) {
    const err = new Error(
      `Could not find an "Item" column in the spreadsheet. Found columns: ${Object.keys(sampleRow).join(', ')}`
    );
    err.statusCode = 422;
    throw err;
  }

  // Extract, clean, deduplicate
  const seen = new Set();
  const ingredients = [];

  for (const row of rows) {
    const raw = String(row[itemKey] ?? '').trim().toLowerCase();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    ingredients.push(raw);
  }

  if (ingredients.length === 0) {
    const err = new Error('No ingredients found in the "Item" column. Please fill in your grocery items.');
    err.statusCode = 422;
    throw err;
  }

  // Cap at 20 ingredients (Spoonacular performs best within this limit)
  return ingredients.slice(0, 20);
};

module.exports = { parseIngredients };
