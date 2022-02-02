const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
    MessageActionRow,
    MessageSelectMenu,
    MessageButton
} = require('discord.js');
const mysql = require('mysql');
const pm2 = require('pm2');
const config = require('../config/config.json');

module.exports = {
    sendTruncateMessage: async function sendTruncateMessage(receivedMessage) {
        let truncateTableList = config.truncate.truncateOptions;
        var buttonList = [];
        if (truncateTableList.length === 0) {
            receivedMessage.channel.send('No tables are set in config.').catch(console.error);
            return;
        }
        if (truncateTableList.length > 24) {
            console.log("ERROR: Max number of truncate options is 24");
            receivedMessage.channel.send("ERROR: Max number of truncate options is 24").catch(console.error);
            return;
        }
        for (var t in truncateTableList) {
            let tableLabel = truncateTableList[t].replace(/\+/g, " + ");
            let buttonID = `${config.serverName}~truncate~${truncateTableList[t].toLowerCase()}`;
            let button = new MessageButton().setCustomId(buttonID).setLabel(tableLabel).setStyle('PRIMARY');
            buttonList.push(button);
        } //End of t loop
        let cancelButton = new MessageButton().setCustomId(`${config.serverName}~truncate~!CANCEL!`).setLabel('Cancel').setStyle('DANGER');
        buttonList.push(cancelButton);
        var buttonsNeeded = buttonList.length;
        let rowsNeeded = Math.ceil(buttonList.length / 5);
        var buttonCount = 0;
        var messageComponents = [];
        for (var n = 0; n < rowsNeeded && n < 5; n++) {
            var buttonRow = new MessageActionRow()
            for (var r = 0; r < 5; r++) {
                if (buttonCount < buttonsNeeded) {
                    buttonRow.addComponents(buttonList[buttonCount]);
                    buttonCount++;
                }
            } //End of r loop
            messageComponents.push(buttonRow);
        } //End of n loop
        receivedMessage.channel.send({
            content: `**Truncate Table:**`,
            components: messageComponents
        }).catch(console.error);
    }, //End of sendTruncateMessage()


    truncateTables: async function truncateTables(interaction, interactionID, tables) {
        let connection = mysql.createConnection(config.madDB);
        connection.connect();
        interaction.message.edit({
            embeds: [new MessageEmbed().setTitle('Truncate Results:').setDescription('**Truncating...**')],
            components: []
        }).catch(console.error);
        var good = [];
        var bad = [];
        var restartMAD = false;
        for (var t in tables) {
            let truncateQuery = `TRUNCATE ${tables[t]}`;
            connection.query(truncateQuery, function (err, results) {
                if (err) {
                    console.log(`(${interaction.user.username}) Error truncating ${config.madDB.database}.${tables[t]}:`, err);
                    bad.push(tables[t]);
                } else {
                    console.log(`${config.madDB.database}.${tables[t]} truncated by ${interaction.user.username}`);
                    good.push(tables[t]);
                    if (tables[t] === 'trs_quest' && config.pm2.mads.length > 0) {
                        let date = new Date();
                        let hour = date.getHours();
                        var onlyRestartTime = 0;
                        if (config.truncate.onlyRestartBeforeTime !== ''){
                            onlyRestartTime = config.truncate.onlyRestartBeforeTime * 1;
                        }
                        if (onlyRestartTime == 0 || hour < config.truncate.onlyRestartBeforeTime) {
                            restartMAD = true;
                        }
                    }
                }
            });
            await new Promise(done => setTimeout(done, 5000));
        } //End of t loop
        connection.end();
        var color = '00841E';
        var description = `Successful:\n- ${good.join('\n- ')}`;
        if (good.length == 0) {
            description = '';
        }
        if (bad.length > 0) {
            color = '9E0000';
            description = description.concat(`\n\nFailed:\n- ${bad.join('\n- ')}`);
        }
        interaction.message.edit({
            embeds: [new MessageEmbed().setTitle('Truncate Results:').setDescription(description).setColor(color).setFooter(`${interaction.user.username}`)],
            components: []
        }).catch(console.error);
        if (restartMAD === true) {
            module.exports.restartMADs(interaction, description, color);
        }
    }, //End of truncateTables()


    verifyTruncate: async function verifyTruncate(interaction, interactionID, tables) {
        let optionRow = new MessageActionRow().addComponents(
            new MessageButton().setCustomId(`${config.serverName}~verifyTruncate~yes`).setLabel(`Yes`).setStyle("SUCCESS"),
            new MessageButton().setCustomId(`${config.serverName}~verifyTruncate~no`).setLabel(`No`).setStyle("DANGER")
        )
        var title = 'Truncate the following table?';
        if (tables.length > 1) {
            title = 'Truncate the following tables?';
        }
        interaction.message.channel.send({
            embeds: [new MessageEmbed().setTitle(title).setDescription(tables.join('\n')).setColor('0D00CA')],
            components: [optionRow]
        }).catch(console.error);
    }, //End of verifyTruncate()


    restartMADs: async function restartMADs(interaction, description, color) {
        interaction.message.edit({
            embeds: [new MessageEmbed().setTitle('Truncate Results:').setDescription(`${description}\n\n**Restarting MADs...**`).setColor(color)],
            components: []
        }).catch(console.error);
        let mads = config.pm2.mads;
        var good = [];
        var bad = [];
        await pm2.connect(async function (err) {
            if (err) {
                console.error(err);
            } else {
                for (m in mads) {
                    let processName = mads[m];
                    pm2.restart(processName, (err, response) => {
                        if (err) {
                            console.error(`(${interaction.user.username}) PM2 ${mads[m]} restart error:`, err);
                            bad.push(mads[m]);
                        } else {
                            console.log(`${mads[m]} restarted by ${interaction.user.username}`);
                            good.push(mads[m]);
                        }
                    }) //End of pm2.restart
                    await new Promise(done => setTimeout(done, 5000));
                } //End of m loop
            }
        }) //End of pm2.connect
        await new Promise(done => setTimeout(done, 5000 * mads.length + 1000));
        pm2.disconnect();
        color = '00841E';
        var newDescription = `${description}\n\n**MAD Restart Results:**\nSuccessful:\n- ${good.join('\n- ')}`;
        if (good.length == 0) {
            newDescription = newDescription.concat(`None!`);
        }
        if (bad.length > 0) {
            color = '9E0000';
            newDescription = newDescription.concat(`\n\nFailed:\n- ${bad.join('\n- ')}`);
        }
        interaction.message.edit({
            embeds: [new MessageEmbed().setTitle('Truncate Results:').setDescription(newDescription).setColor(color).setFooter(`${interaction.user.username}`)],
            components: []
        }).catch(console.error);
        //})
    } //End of restartMADs()
}
