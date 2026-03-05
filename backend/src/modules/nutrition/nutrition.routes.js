const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFoodImage, addManualEntry, getFoodLog, updateFoodLog, deleteFoodLog } = require('./nutrition.controller');
const { authenticate } = require('../../middleware/auth');

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

router.get('/log', authenticate, getFoodLog);
router.post('/log', authenticate, addManualEntry);
router.post('/upload', authenticate, upload.single('food_image'), uploadFoodImage);
router.put('/log/:id', authenticate, updateFoodLog);
router.delete('/log/:id', authenticate, deleteFoodLog);

module.exports = router;
