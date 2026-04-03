const puppeteer = require('puppeteer');

(async () => {
    console.log('🔗 Launching Puppeteer diagnosis...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Intercept logs
    page.on('console', msg => {
        if (msg.text().includes('[Dashboard]') || msg.text().includes('[Profiles]') || msg.text().includes('Redirect')) {
            console.log(`[Browser Console]: ${msg.text()}`);
        }
    });

    let navHistory = [];
    page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) {
            const url = frame.url();
            const path = new URL(url).pathname;
            if (navHistory[navHistory.length - 1] !== path) {
                navHistory.push(path);
                console.log(`🧭 Navigation Event: ${path}`);
            }
        }
    });

    try {
        console.log('>> Visiting /profiles');
        await page.goto('http://localhost:3000/profiles', { waitUntil: 'networkidle2' });
        
        // Wait for profiles to load
        await page.waitForSelector('.profile-card', { timeout: 5000 });
        
        console.log('>> Clicking the first available non-guest/add profile card...');
        // Find a real profile (no profile-card-guest or add classes)
        const profileCards = await page.$$('.profile-card:not(.profile-card-guest):not(.profile-card-add)');
        if (profileCards.length > 0) {
            await profileCards[0].click();
            console.log('>> Clicked profile. Waiting 10 seconds to observe routing loop...');
            
            // Wait to see what happens
            await new Promise(r => setTimeout(r, 10000));
            
            console.log('\n--- LOCAL STORAGE STATE ---');
            const ls = await page.evaluate(() => {
                return {
                    activeProfile: localStorage.getItem('activeProfile'),
                    profileToken: localStorage.getItem('profileToken') ? 'EXISTS' : 'NULL',
                    accountToken: localStorage.getItem('accountToken') ? 'EXISTS' : 'NULL'
                };
            });
            console.log(JSON.stringify(ls, null, 2));
            
            console.log('\n--- REDIRECT LOOP PATH TRACE ---');
            console.log(navHistory.join('  ->  '));
            
        } else {
            console.log('❌ No profiles found on the page.');
        }

    } catch (e) {
        console.error('Error during test:', e.message);
    } finally {
        await browser.close();
    }
})();
