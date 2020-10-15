const fetch = require("node-fetch");

const htmlParser = require("node-html-parser");

const fs = require('fs');

const {
    renderGameList,
    renderHTMLPage
} = require("./render");

const moment = require("moment")

const ical = require("ical-generator");

const {createHash}= require('crypto');
/**
 * @param {string} algorithm
 * @param {any} content
 *  @return {string}
 */
const encrypt = (algorithm, content) => {
  let hash = createHash(algorithm)
  hash.update(content)
  return hash.digest('hex')
}
/**
 * @param {any} content
 *  @return {string}
 */
const sha1 = (content) => encrypt('sha1', content)

function gameEventDescription(platforms, url) {
    return `
Platforms: ${platforms.join(", ")}
Url: ${url}
`
}

async function render(year = "2020", htmlFile = "public/index.html", dataFile = "public/data.json", icsFile = "public/event.ics") {
    const response = await fetch(`https://www.gameinformer.com/${year}`);

    const body = await response.text()

    const root = htmlParser.parse(body);

    const asArray = (list) => {
        return Array.prototype.slice.apply(list)
    };
    const calender_entries = root.querySelectorAll(".calendar_entry");

    const cal = ical({domain: "kimleo.net", name: "Game Calendar of the Year"}).timezone("Asia/Shanghai");

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


        if (releaseDate !== undefined) {
            cal.createEvent({
                start: moment(new Date(`${releaseDate} ${year}`)),
                uid: sha1(`${title}-${releaseDate}-${platforms.join("-")}`),
                allDay: true,
                summary: title,
                description: gameEventDescription(platforms, `https://www.gameinformer.com${url}`),
                url: `https://www.gameinformer.com${url}`
            });
        }
        
        return {
            title, url, releaseDate, platforms
        }
    })

    fs.writeFileSync(icsFile, cal.toString());

    fs.writeFileSync(htmlFile, renderHTMLPage(renderGameList(result, year), year));

    fs.writeFileSync(dataFile, JSON.stringify(result));
}

(async() => {
    await render("2020", "public/index.html", "public/data.json", "public/2020.ics");
    await render("2021", "public/2021.html", "public/2021.json", "public/2021.ics");
})();