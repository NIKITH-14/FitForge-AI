const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFoodImage, addManualEntry, getFoodLog, updateFoodLog, deleteFoodLog } = require('./nutrition.controller');
const { authenticateProfile } = require('../../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files allowed'));
        }
        cb(null, true);
    },
});

router.get('/log', authenticateProfile, getFoodLog);
router.post('/log', authenticateProfile, addManualEntry);
router.post('/upload', authenticateProfile, upload.single('food_image'), uploadFoodImage);
router.put('/log/:id', authenticateProfile, updateFoodLog);
router.delete('/log/:id', authenticateProfile, deleteFoodLog);

module.exports = router;
