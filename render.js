
function renderHTMLPage(body) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Game Calendar of 2020 by KimmyLeo</title>
    </head>
    <body>
        <h1>Game Calendar 2020</h1>
        <a href="#upcoming-release">Upcoming</a>
        <p>
        <small>Author: <a href="http://kimleo.net">KimmyLeo</a>.</small>
        <small>Generated using Game Informer's data, updated every week.</small>
        </p>
    
        ${body}
    </body>
    </html>
`
}

function renderGameList(data) {

    const now = new Date()
    let upcomingSet = false

    const dates = []

    const games = {}

    data.forEach(game => {
        if (game.releaseDate === undefined) {
            game.releaseDate = "unconfirmed"
        }
        if (!dates.includes(game.releaseDate)) {
            dates.push(game.releaseDate);
            games[game.releaseDate] = []
        }

        games[game.releaseDate].push(game);
    })

    let html = "<dl>"

    dates.forEach(date => {
        const dateObj = new Date(`${date} 2020`)
        if (!upcomingSet && dateObj > now) {
            html += `<dt id="upcoming-release">${date}</dt>`
            upcomingSet = true
        } else {
            html += `<dt>${date}</dt>`
        }
        html += `<dd><ul>`
        games[date].forEach(game => {
            html += (`<li><b>${game.title}</b> <i>${game.platforms.join(", ")}</i>` +
                    `&nbsp;|&nbsp;<a href="https://www.gameinformer.com${game.url}">gameinformer.com</a></li>`)
        })

        html += `</ul></dd>`
    })

    html += '</dl>'
    return html
}

module.exports = {
    renderGameList,
    renderHTMLPage
}
