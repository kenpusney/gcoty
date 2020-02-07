const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        headless: false
    });

    const page = await browser.newPage();
    await page.goto("https://www.gameinformer.com/2020", {
        timeout: 5 * 60 * 1000
    });
    const data = await page.evaluate(() => {
        const asArray = (list) => {
            return Array.prototype.slice.apply(list)
        };
        const calender_entries = asArray(document.querySelectorAll(".calendar_entry"));

        return calender_entries.map(it => {
            const link = it.querySelector("a");
            const title = it.innerText;
            const url = link.href;
            let releaseDate;
            if (it.querySelector('time')) {
                releaseDate = it.querySelector('time').innerText;
            }
            const platforms = asArray(it.querySelectorAll("em")).map(tag => tag.innerText);

            return {
                title, url, releaseDate, platforms
            }
        })
    });
    console.log(data);
})();