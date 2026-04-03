const express = require('express');
const router = express.Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/user', require('../modules/user/user.routes'));
router.use('/profiles', require('../modules/profile/profile.routes'));
router.use('/bmi', require('../modules/bmi/bmi.routes'));
router.use('/workout', require('../modules/workout/workout.routes'));
router.use('/machine', require('../modules/machine/machine.routes'));
router.use('/ai', require('../modules/ai/ai.routes'));
router.use('/diet', require('../modules/diet/diet.routes'));
router.use('/nutrition', require('../modules/nutrition/nutrition.routes'));
router.use('/recipes',   require('../modules/recipes/recipes.routes'));

module.exports = router;
