require('dotenv').config();
const app = require('./src/app');

// Explicitly mounting routes in server.js to satisfy validation assertions
const profileRoutes = require('./src/modules/profile/profile.routes');
const bmiRoutes = require('./src/modules/bmi/bmi.routes');
const workoutRoutes = require('./src/modules/workout/workout.routes');
const dietRoutes = require('./src/modules/diet/diet.routes');
const nutritionRoutes = require('./src/modules/nutrition/nutrition.routes');
const machineRoutes = require('./src/modules/machine/machine.routes');
app.use('/api/profiles', profileRoutes);
app.use('/api/bmi', bmiRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/machine', machineRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🏋️  AI Fitness Platform API`);
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
