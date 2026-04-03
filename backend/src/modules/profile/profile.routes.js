const express = require('express');
const router = express.Router();
const {
    getProfileById,
    getProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    deleteBulkProfiles,
    selectProfile,
    verifyPin,
} = require('./profile.controller');
const { authenticate, authenticateProfile, authenticateMachine, authenticateAny } = require('../../middleware/auth');

// Account-level management (requires account JWT)
router.get('/', authenticate, getProfiles);

// GET /profiles/:id — uses authenticateAny (NARROW EXCEPTION).
// Accepts both accountToken and profileToken because the dashboard BodyStats
// component needs to fetch profile data using only a profileToken (no account JWT
// is available after profile selection on the dashboard).
// This is READ-ONLY — no data is mutated through this route.
router.get('/:id', authenticateAny, getProfileById);

router.post('/', authenticate, createProfile);

// Bulk cleanup — permanently deletes ALL non-admin profiles for the account.
// IMPORTANT: this route MUST be declared before /:id so Express routes the
// literal path segment "bulk-cleanup" correctly (not as a :id param value).
// Requires account JWT. Owner/admin profile is always preserved.
router.delete('/bulk-cleanup', authenticate, deleteBulkProfiles);

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
