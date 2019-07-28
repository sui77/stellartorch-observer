const axios = require("axios");
const Bot = require('keybase-bot')
const StellarSdk = require('stellar-sdk');

StellarSdk.Network.usePublicNetwork();

const config = require('./config.js');

const horizon = new StellarSdk.Server(config.stellar.horizonUrl);

const bot = new Bot();
bot
    .init(config.keybase.username, config.keybase.paperkey, {verbose: false})
    .then(() => {
        console.log(`Your bot is initialized. It is logged in as ${bot.myInfo().username}`);
        observe(config.stellar.accountId);
    })
    .catch(error => {
        console.error(error)
        bot.deinit()
    });

function observe(accountId) {
    console.log("Observing " + accountId.substr(0, 6) + "...");
    try {
        let opStream = horizon.operations()
            .cursor('now')
            .forAccount(accountId)
            .stream({
                onmessage: async function (op) {

                    if (op.type == 'payment' && op.from == accountId) {

                        tx = await op.transaction();
                        if (typeof tx.memo == "string") {

                            let found = tx.memo.match(/[\-0-9\.]+ *, *[\-0-9\.]+/);
                            if (found) {
                                observe(op.to);
                                opStream();  // close current stream

                                let loc = await getLocationName(found[0].replace(' ', ''));
                                let text = "> *From:* " + op.from +
                                    "\n> *To:* " + op.to +
                                    "\n> *Coordinates:* " + found[0].replace(' ', '') +
                                    "\n> *Location:* " + loc;
                                sendMessage(text);
                            }
                        }
                    }
                }
            });
    } catch (e) {
        console.log(e);
    }
}


function sendMessage(msg) {
    bot.chat
        .send(config.keybase.channel, {body: msg})
        .then(() => {
            console.log('Message sent!')
        })
        .catch(error => {
            console.error(error)
        })
}

async function getLocationName(q) {
    d = await axios.get('https://api.opencagedata.com/geocode/v1/json?key=' + config.opencagedata.apiKey + '&q=' + q + '&no_annotations=1');
    let r = d.data.results[0].components;
    let resultString = '';
    if (typeof r.village != 'undefined') {
        resultString += r.village + ", ";
    } else if (typeof r.town != 'undefined') {
        resultString += r.town + ", ";
    } else if (typeof r.city != 'undefined') {
        resultString += r.city + ", ";
    } else if (typeof r.county != 'undefined') {
        resultString += r.county + ", ";
    }

    if (typeof r.country != 'undefined') {
        resultString += r.country;
    }

    return resultString;

}
