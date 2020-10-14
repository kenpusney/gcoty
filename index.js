const fetch = require("node-fetch");

const htmlParser = require("node-html-parser");

const fs = require('fs');

const {
    renderGameList,
    renderHTMLPage
} = require("./render");

async function render(year = "2020", htmlFile = "index.html", dataFile = "data.json") {
    const response = await fetch(`https://www.gameinformer.com/${year}`);

    const body = await response.text()

    const root = htmlParser.parse(body);

    const asArray = (list) => {
        return Array.prototype.slice.apply(list)
    };
    const calender_entries = root.querySelectorAll(".calendar_entry");

    const result = calender_entries.map(it => {
        const link = it.querySelector("a");
        const title = link.text;
        const url = link.attributes['href'];
        let releaseDate;
        if (it.querySelector('time')) {
            releaseDate = it.querySelector('time').text;
        }
        const platforms = it.querySelectorAll("em")
                .map(tag => tag.text.split(", "))
                .reduce((a, b) => a.concat(b), []);

        return {
            title, url, releaseDate, platforms
        }
    })


    fs.writeFileSync(htmlFile, renderHTMLPage(renderGameList(result, year), year));

    fs.writeFileSync(dataFile, JSON.stringify(result));
}

(async() => {
    await render("2020", "public/index.html", "public/data.json");
    await render("2021", "public/2021.html", "public/2021.json");
})();