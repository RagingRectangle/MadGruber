const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
    MessageActionRow,
    MessageButton
} = require('discord.js');
const fs = require('fs');
const pm2 = require('pm2');
const UpdateButtons = require('./update_buttons.js');
const Scripts = require('./scripts.js');
const Queries = require('./queries.js');
const config = require('../config/config.json');
const scriptConfig = require('../config/scripts.json');

module.exports = {
    listInteraction: async function listInteraction(interaction, interactionID) {
        if (interactionID === 'scriptList') {
            let intValues = interaction.values[0].replace(`${config.serverName}~startScript~`, '').split('~');
            let scriptName = intValues[0];
            let variableCount = intValues[1] * 1;
            for (var s in scriptConfig) {
                if (scriptName === scriptConfig[s]['customName'] && scriptConfig[s]['fullFilePath']) {
                    Scripts.startScript(interaction, scriptConfig[s], scriptName, variableCount);
                }
            }
        } else if (interactionID === 'runScript') {
            if (interaction.values[0] === `${config.serverName}~cancelScript`) {
                interaction.deferUpdate();
                Scripts.sendScriptList(interaction, 'restart');
            } else {
                Scripts.scriptVariables(interaction);
            }
        } else if (interactionID === 'countList') {
            let countType = interaction.values[0].replace(`${config.serverName}~count~`, '');
            Queries.queryCount(interaction, countType);
        }
    }, //End of listInteraction()


    buttonInteraction: async function buttonInteraction(interaction, interactionID) {
        //Restart menu pressed
        if (interactionID === 'restart') {
            interaction.deferUpdate();
            var newButtons = interaction.message.components;
            for (var r = 0; r < newButtons.length - 1; r++) {
                let row = newButtons[r]['components'];
                for (var b in row) {
                    row[b]['style'] = 1;
                    row[b]['custom_id'] = `${config.serverName}~process~restart~${row[b]['label']}`;
                } //End of b loop
            } //End of r loop
            interaction.message.edit({
                content: `**Restart ${config.serverName} Processes:**`,
                components: newButtons
            });
        } 
        //Start menu pressed
        else if (interactionID === 'start') {
            interaction.deferUpdate();
            var newButtons = interaction.message.components;
            for (var r = 0; r < newButtons.length - 1; r++) {
                let row = newButtons[r]['components'];
                for (var b in row) {
                    row[b]['style'] = 3;
                    row[b]['custom_id'] = `${config.serverName}~process~start~${row[b]['label']}`;
                } //End of b loop
            } //End of r loop
            interaction.message.edit({
                content: `**Start ${config.serverName} Processes:**`,
                components: newButtons
            });
        } 
        //Stop menu pressed
        else if (interactionID === 'stop') {
            interaction.deferUpdate();
            var newButtons = interaction.message.components;
            for (var r = 0; r < newButtons.length - 1; r++) {
                let row = newButtons[r]['components'];
                for (var b in row) {
                    row[b]['style'] = 4;
                    row[b]['custom_id'] = `${config.serverName}~process~stop~${row[b]['label']}`;
                } //End of b loop
            } //End of r loop
            interaction.message.edit({
                content: `**Stop ${config.serverName} Processes:**`,
                components: newButtons
            });
        } 
        //Status menu pressed
        else if (interactionID === 'status') {
            UpdateButtons.updateButtons(interaction, 'edit');
            interaction.deferUpdate();
        } 
        //Do PM2 stuff
        else if (interactionID.startsWith('process~')) {
            interaction.deferUpdate();
            interactionID = interactionID.replace('process~', '');
            pm2.connect(async function (err) {
                if (err) {
                    console.log(err);
                    pm2.disconnect();
                } else {
                    if (interactionID.startsWith('restart~')) {
                        let processName = interactionID.replace('restart~', '');
                        pm2.restart(processName, (err, response) => {
                            if (err) {
                                console.log(err);
                                pm2.disconnect();
                            } else {
                                console.log(`${processName} restarted`);
                                pm2.disconnect();
                            }
                        });
                    } else if (interactionID.startsWith('start~')) {
                        let processName = interactionID.replace('start~', '');
                        pm2.start(processName, (err, response) => {
                            if (err) {
                                console.log(err);
                                pm2.disconnect();
                            } else {
                                console.log(`${processName} started`);
                                pm2.disconnect();
                            }
                        });
                    } else if (interactionID.startsWith('stop~')) {
                        let processName = interactionID.replace('stop~', '');
                        pm2.stop(processName, (err, response) => {
                            if (err) {
                                console.log(err);
                                pm2.disconnect();
                            } else {
                                console.log(`${processName} stopped`);
                                pm2.disconnect();
                            }
                        });
                    } else {
                        pm2.disconnect();
                    }
                }
            }) //End of pm2.connect
        }
    }, //End of buttonInteraction()
}