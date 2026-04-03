const express = require('express');
const router = express.Router();
const { getProfileById, getProfiles, createProfile, updateProfile, deleteProfile, selectProfile, verifyPin } = require('./profile.controller');
const { authenticate, authenticateProfile, authenticateMachine } = require('../../middleware/auth');

// Account-level management (requires account JWT)
router.get('/', authenticate, getProfiles);
router.get('/:id', authenticate, getProfileById);
router.post('/', authenticate, createProfile);
router.put('/:id', authenticate, updateProfile);
router.delete('/:id', authenticate, deleteProfile);

// Profile selection — supports BOTH account JWT and machine token
// Machine token variant (kiosk boot flow — no account login required)
router.post('/:id/select', authenticateMachine, (req, res, next) => {
    req.user = { userId: '__machine__' }; // placeholder so controller still works
    next();
}, selectProfile);
router.post('/:id/verify-pin', authenticateMachine, (req, res, next) => {
    req.user = { userId: '__machine__' };
    next();
}, verifyPin);

// Account JWT variants (for when user is logged in as an account)
router.post('/:id/select-account', authenticate, selectProfile);
router.post('/:id/verify-pin-account', authenticate, verifyPin);

module.exports = router;
