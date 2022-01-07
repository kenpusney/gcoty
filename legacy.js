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

function gameEventDescription(platforms) {
    return `
Platforms: ${platforms.join(", ")}
`
}

async function render(year = "2016") {
    const htmlFile = `public/${year}.html`;
    const dataFile = `public/${year}.json`;
    const icsFile = `public/${year}.ics`;

    const data = require(`./data/${year}-plain.json`);

    const cal = ical({domain: "kimleo.net", name: "Game Calendar of the Year"}).timezone("Asia/Shanghai");

    const result = data.map(it => {

        const group = /^(.*)\s*\((.*)\)\s*-\s*(.*)$/.exec(it);
        console.log(it, group)
        const title = group[1].trim()
        // const url = link.attributes['href'];
        const platforms = group[2].split(", ").filter(it => it);
        const releaseDate = group[3].trim()

        if (releaseDate !== undefined) {
            cal.createEvent({
                start: moment(new Date(`${releaseDate} ${year}`)),
                uid: sha1(`${title}-${releaseDate}-${platforms.join("-")}`),
                allDay: true,
                summary: title,
                location: platforms.join(", "),
                description: gameEventDescription(platforms),
                // url: `https://www.gameinformer.com${url}`
            });
        }
        
        return {
            title, releaseDate, platforms
        }
    })

    fs.writeFileSync(icsFile, cal.toString());

    fs.writeFileSync(htmlFile, renderHTMLPage(renderGameList(result, year), year));

    fs.writeFileSync(dataFile, JSON.stringify(result));
}

(async() => {
    // await render("2020", "public/2020.html", "public/2020.json", "public/2020.ics");
    for (let year of ['2016', '2017', '2018']) {
        await render(year)
    }
})();
