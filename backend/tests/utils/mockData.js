const mockSpoonacularResponse = [
  {
    id: 123456,
    title: 'Egg Tomato Stir Fry',
    image: 'https://img.spoonacular.com/recipes/123456-312x231.jpg',
    usedIngredientCount: 2,
    missedIngredientCount: 1,
    usedIngredients: [{ name: 'egg' }, { name: 'tomato' }],
    missedIngredients: [{ name: 'oil' }],
    likes: 142
  },
  {
    id: 654321,
    title: 'Tomato and Egg Soup',
    image: 'https://img.spoonacular.com/recipes/654321-312x231.jpg',
    usedIngredientCount: 2,
    missedIngredientCount: 2,
    usedIngredients: [{ name: 'tomato' }, { name: 'egg' }],
    missedIngredients: [{ name: 'salt' }, { name: 'pepper' }],
    likes: 89
  }
];

module.exports = { mockSpoonacularResponse };
