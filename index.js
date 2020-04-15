const fetch = require("node-fetch");

const htmlParser = require("node-html-parser");

const fs = require('fs');

const {
    renderGameList,
    renderHTMLPage
} = require("./render");

(async () => {
    const response = await fetch("https://www.gameinformer.com/2020");

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


    fs.writeFileSync("index.html", renderHTMLPage(renderGameList(result)));

    fs.writeFileSync("data.json", JSON.stringify(result));
})();