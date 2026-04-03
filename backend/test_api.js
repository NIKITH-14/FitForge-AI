require('dotenv').config();
const pool = require('./src/config/db');
const { generateAccessToken } = require('./src/config/jwt');
const http = require('http');

function makeRequest(options) {
    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', (e) => resolve({ status: 0, body: e.message }));
        req.end();
    });
}

async function run() {
    const MACHINE_SECRET = process.env.MACHINE_SECRET || 'fallback_machine_secret';
    let passed = 0, failed = 0;

    const check = (label, condition) => {
        if (condition) { console.log(`  ✅ PASS: ${label}`); passed++; }
        else { console.log(`  ❌ FAIL: ${label}`); failed++; }
    };

    try {
        // ── Test 1: Machine Boot ───────────────────────────────────────
        console.log('\n--- Test 1: POST /api/machine/boot ---');
        const bootRes = await makeRequest({
            hostname: 'localhost', port: 5000,
            path: '/api/machine/boot', method: 'POST',
            headers: { 'x-machine-token': MACHINE_SECRET }
        });
        console.log('  Status:', bootRes.status, '| Profiles:', bootRes.body?.profiles?.length);
        check('Status 200', bootRes.status === 200);
        check('Returns profiles array', Array.isArray(bootRes.body?.profiles));
        check('Has migrated profiles', (bootRes.body?.profiles?.length ?? 0) > 0);

        // ── Test 2: Generate Account JWT ──────────────────────────────
        console.log('\n--- Test 2: Build Account JWT ---');
        const userRes = await pool.query('SELECT * FROM users LIMIT 1');
        const user = userRes.rows[0];
        check('Found existing user', !!user);
        const accountToken = generateAccessToken({ userId: user.id, email: user.email });
        check('Account JWT generated', accountToken.length > 20);

        // ── Test 3: List Profiles ──────────────────────────────────────
        console.log('\n--- Test 3: GET /api/profiles ---');
        const profListRes = await makeRequest({
            hostname: 'localhost', port: 5000,
            path: '/api/profiles', method: 'GET',
            headers: { 'Authorization': `Bearer ${accountToken}` }
        });
        console.log('  Status:', profListRes.status, '| Count:', profListRes.body?.profiles?.length);
        check('Status 200', profListRes.status === 200);
        check('Profiles list returned', Array.isArray(profListRes.body?.profiles));
        check('Has 1+ profiles', (profListRes.body?.profiles?.length ?? 0) > 0);

        // ── Test 4: Profile Selection (Profile JWT) ────────────────────
        console.log('\n--- Test 4: POST /api/profiles/:id/select ---');
        const firstProfileId = profListRes.body?.profiles?.[0]?.id;
        let profileToken = null;
        if (firstProfileId) {
            const selRes = await makeRequest({
                hostname: 'localhost', port: 5000,
                path: `/api/profiles/${firstProfileId}/select`, method: 'POST',
                headers: { 'Authorization': `Bearer ${accountToken}` }
            });
            console.log('  Status:', selRes.status, '| Name:', selRes.body?.profile?.name);
            check('Status 200', selRes.status === 200);
            check('Returns profileToken JWT', typeof selRes.body?.profileToken === 'string');
            profileToken = selRes.body?.profileToken;
        } else {
            check('Has profile ID for selection', false);
        }

        // ── Test 5: Profile-Scoped BMI ────────────────────────────────
        if (profileToken) {
            console.log('\n--- Test 5: GET /api/bmi (profile-scoped) ---');
            const bmiRes = await makeRequest({
                hostname: 'localhost', port: 5000,
                path: '/api/bmi', method: 'GET',
                headers: { 'Authorization': `Bearer ${profileToken}` }
            });
            console.log('  Status:', bmiRes.status, '|', JSON.stringify(bmiRes.body).slice(0, 100));
            // Either 200 (has data) or 404 (no BMI records yet) — both fine, NOT 401/403
            check('Auth accepted (not 401/403)', bmiRes.status !== 401 && bmiRes.status !== 403);
        }

        // ── Test 6: Invalid machine token ──────────────────────────────
        console.log('\n--- Test 6: Invalid machine token rejection ---');
        const badMachRes = await makeRequest({
            hostname: 'localhost', port: 5000,
            path: '/api/machine/boot', method: 'POST',
            headers: { 'x-machine-token': 'definitely-wrong-token' }
        });
        check('Returns 401 for bad token', badMachRes.status === 401);

    } catch (err) {
        console.error('Test error:', err.message);
    }

    console.log(`\n${'='.repeat(40)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(40));
    process.exit(failed > 0 ? 1 : 0);
}

setTimeout(run, 500);
