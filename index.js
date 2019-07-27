const Bot = require('keybase-bot')
const StellarSdk = require('stellar-sdk');

StellarSdk.Network.usePublicNetwork();

const keybaseUsername = 'suibot';
const keybasePaperkey = 'door ...';
const keybaseChannel = {name: 'sui_zabbix', membersType: 'team', topicName: 'alerts'}

const accountId = 'GB2P5P4EOYFJW2DSAHJQO7TXTBZZSH4CAS6M5TYM5EJRH7VQTQL7T2KC';

const horizon = new StellarSdk.Server('https://horizon.stellar.org');

const bot = new Bot();
bot
    .init(keybaseUsername, keybasePaperkey, {verbose: false})
    .then(() => {
        console.log(`Your bot is initialized. It is logged in as ${bot.myInfo().username}`);
        observe(accountId);
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

                            let found = tx.memo.match(/[0-9\.]+ *, *[0-9\.]+/);
                            if (found) {
                                let text = "Stellartorch sent from " + op.from + " to " + op.to + " coords: " + found[0].replace(' ', '');
                                sendMessage(text);
                                observe(op.to);
                                opStream();  // close current stream
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
        .send(keybaseChannel, {body: msg})
        .then(() => {
            console.log('Message sent!')
        })
        .catch(error => {
            console.error(error)
        })
}
