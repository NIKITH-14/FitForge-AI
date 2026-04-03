/**
 * generateFixtures.js
 * Run with: node backend/tests/utils/generateFixtures.js
 * Creates the three .xlsx test fixture files used in recipesExcel.test.js.
 */
const XLSX  = require('xlsx');
const path  = require('path');
const fs    = require('fs');

const outDir = __dirname;

// ── 1. valid.xlsx — two items, typical grocery list format ───────────────────
const validData = [
  { Item: 'Chicken',    Quantity: '500g',  Price: '2.99' },
  { Item: 'Tomato',     Quantity: '6 pcs', Price: '1.50' },
  { Item: 'Garlic',     Quantity: '1 bulb',Price: '0.75' },
  { Item: 'Spinach',    Quantity: '200g',  Price: '1.20' },
  { Item: 'Olive Oil',  Quantity: '500ml', Price: '4.99' },
];
const validWs = XLSX.utils.json_to_sheet(validData);
const validWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(validWb, validWs, 'GroceryList');
XLSX.writeFile(validWb, path.join(outDir, 'valid.xlsx'));
console.log('✅ valid.xlsx written');

// ── 2. invalid_column.xlsx — no "Item" column (has "Product" instead) ────────
const invalidColData = [
  { Product: 'Milk', Amount: '1L', Cost: '1.00' },
  { Product: 'Eggs', Amount: '12', Cost: '2.00' },
];
const invalidColWs = XLSX.utils.json_to_sheet(invalidColData);
const invalidColWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(invalidColWb, invalidColWs, 'Sheet1');
XLSX.writeFile(invalidColWb, path.join(outDir, 'invalid_column.xlsx'));
console.log('✅ invalid_column.xlsx written');

// ── 3. empty.xlsx — sheet exists but has no rows ─────────────────────────────
const emptyWb = XLSX.utils.book_new();
const emptyWs = XLSX.utils.aoa_to_sheet([['Item', 'Quantity', 'Price']]);
XLSX.utils.book_append_sheet(emptyWb, emptyWs, 'Sheet1');
XLSX.writeFile(emptyWb, path.join(outDir, 'empty.xlsx'));
console.log('✅ empty.xlsx written');

console.log('\nAll test fixtures generated in:', outDir);
