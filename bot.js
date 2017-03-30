const Telegraf = require('telegraf'),
    crypto = require('crypto'),
    fetch = require('node-fetch'),
    moment = require('moment'),
    _ = require('underscore');

require('moment/locale/de');

class Bot {
    constructor(url, port, telegramApiToken, backendUrl, iconUrl) {
        Object.assign(this, { url, port, telegramApiToken, backendUrl, iconUrl });
    }

    init() {
        const bot = new Telegraf(this.telegramApiToken)
        const secret = crypto.randomBytes(64).toString('hex');
        bot.telegram.setWebhook(`${this.url}/${secret}`).then(() => {
            bot.startWebhook(`/${secret}`, null, this.port)
            console.log(`Listening on ${this.url}/${secret}`);
        })

        bot.on('message', (ctx) => {
            handleMessage(ctx.message.text || '');
        })

        bot.on('edited_message', (ctx) => {
            handleMessage(ctx.editedMessage.text || '');
        })

        bot.on('inline_query', (ctx) => {
            let msg = ctx.inlineQuery.query || '';
            console.log(msg);
            try {
                let day = this.getDay(msg);
                let time = this.getTime(msg);
                let inlineUrl = (this.backendUrl === 'http://localhost:8080') ? 'https://walls.de' : this.backendUrl;
                this.getOffers(day, time)
                    .then(offers => {
                        if (offers.length == 0) {
                            throw new Error();
                        }
                        let msg = this.getOfferText(offers);
                        let response = [{
                            id: "offer",
                            title: msg,
                            cache_time: 0,
                            description: `${this.humanDateFormat(day)} ${time}. Jetzt buchen`,
                            type: "article",
                            url: `${inlineUrl}/bookings?date=${day}`,
                            thumb_url: this.iconUrl,
                            input_message_content: {
                                message_text: `${this.humanDateFormat(day)} ${time} ${msg} [Jetzt buchen](${inlineUrl}/bookings?date=${day})`,
                                disable_web_page_preview: true,
                                parse_mode: "Markdown"
                            }
                        }];
                        ctx.answerInlineQuery(response);
                    })
                    .catch(reason => {
                        ctx.answerInlineQuery([{
                            id: "nixfrei",
                            cache_time: 0,
                            title: `Nix mehr frei`,
                            description: `Wieder zu spät dran, wa! Andere Zeiten:`,
                            type: "article",
                            url: `${inlineUrl}/bookings?date=${day}`,
                            thumb_url: this.iconUrl,
                            input_message_content: {
                                message_text: `${this.humanDateFormat(day)} ${time} nix mehr frei [Andere Zeiten](${inlineUrl}/bookings?date=${day})`,
                                disable_web_page_preview: true,
                                parse_mode: "Markdown"
                            }
                        }]);
                    })
            } catch (err) {
                console.log(err);
                ctx.answerInlineQuery([{ "id": "invalid", "title": "Falsches Format", "description": "Richtiges Format: Mo 18:00", "type": "article", "input_message_content": { "message_text": "Frage mich in folgendem Format: Di 17:00", "parse_mode": "Markdown" } }]);
            }
        })
    }

    handleMessage(msg){
        try {
            let day = this.getDay(msg);
            let time = this.getTime(msg);
            this.getOffers(day, time)
                .then(offers => {
                    let response = this.getOfferText(offers);
                    ctx.reply(response, { text: response, parse_mode: 'Markdown', disable_web_page_preview: true });
                })
        } catch (err) {
            ctx.reply(`Anwendung: Mo 18:00`);
        }
    }

    getDay(msg) {
        const weekDays = [
            { name: 'Montag', code: 'Mo' },
            { name: 'Dienstag', code: 'Di' },
            { name: 'Mittwoch', code: 'Mi' },
            { name: 'Donnerstag', code: 'Do' },
            { name: 'Freitag', code: 'Fr' },
            { name: 'Samstag', code: 'Sa' },
            { name: 'Sonntag', code: 'So' }
        ]
        const msgArray = msg.trim().split(" ");
        if (msgArray.length !== 2) {
            throw new Error()
        }
        const weekDay = weekDays.filter((day) => {
            return msgArray[0].toLowerCase() === day.name.toLowerCase() || msgArray[0].toLowerCase() === day.code.toLowerCase()
        })
        if (weekDay.length !== 1) {
            throw new Error()
        }
        let isoWeekday = moment().day(weekDay[0].code).isoWeekday();
        let day = moment();
        if (moment().isoWeekday() > isoWeekday) {
            day = moment().add(1, 'weeks');
        }
        return day.isoWeekday(isoWeekday).format("YYYY-MM-DD");
    }

    getTime(msg) {
        const msgArray = msg.trim().split(" ");
        if (msgArray.length !== 2) {
            throw new Error()
        }
        if (msgArray[1].match(/\d\d\:\d\d/) == null) {
            throw new Error()
        }
        return msgArray[1];
    }

    getOffers(day, time) {
        return new Promise(
            function (resolve, reject) {

                fetch(`${this.backendUrl}/api/offers/${day}/${time}`)
                    .then(function (res) {
                        return res.json();
                    }).then(function (offers) {
                        resolve(offers);
                    });
            }
        );
    }

    getOfferText(offers) {
        switch (offers.length) {
            case 0:
                return `nix mehr frei.`;
            case 1:
                return `noch 1 Platz frei.`;
            default:
                return `noch ${offers.length} Plätze frei.`;
        }
    }

    humanDateFormat(day) {
        return moment(day).format("dd, D. MMM");
    }
}
module.exports = Bot;