const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
    MessageActionRow,
    MessageButton
} = require('discord.js');
const mysql = require('mysql');
const pm2 = require('pm2');
const config = require('../config/config.json');

module.exports = {
    truncateQuests: async function truncateQuests(receivedMessage) {
        let connection = mysql.createConnection(config.madDB);
        connection.connect();
        let truncateQuery = 'TRUNCATE trs_quest;';
        connection.query(truncateQuery, function (err, results) {
            if (err) {
                console.log(err);
            } else {
                console.log(`${config.madDB.database} quests truncated`);
                receivedMessage.channel.send(`mad quests truncated`);
                let date = new Date();
                let hour = date.getHours();
                if (!config.madDB.onlyRestartBeforeTime || hour < config.madDB.onlyRestartBeforeTime){
                    restartMADs();
                }
            }
        });
        connection.end();

        async function restartMADs() {
            pm2.connect(async function (err) {
                if (err) {
                    console.error(err);
                } else {
                    for (var i in config.pm2.mads){
                        let processName = config.pm2.mads[i];
                        pm2.restart(processName, (err, response) => {
                            if (err) {
                                console.error(err);
                            }
                            else {
                                console.log(`${processName} restarted`);
                                receivedMessage.channel.send(`${processName} restarted`);
                            }
                        }); //End of pm2.list
                        await new Promise(done => setTimeout(done, 5000));
                    }
                }
            }); //End of pm2.connect
        } //End of restartMADs()
    }, //End of truncateQuests()
}
