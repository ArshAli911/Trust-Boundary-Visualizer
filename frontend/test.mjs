import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    await page.goto('http://localhost:5174');
    await page.waitForTimeout(1000);
    console.log('Clicking button...');
    await page.click('button:has-text("+ Built-in Node")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("+ Built-in Node")');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot.png' });
    console.log('Saved screenshot.png');

    await browser.close();
})();
