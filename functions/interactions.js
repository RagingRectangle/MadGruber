const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
    MessageActionRow,
    MessageSelectMenu,
    MessageButton
} = require('discord.js');
const fs = require('fs');
const pm2 = require('pm2');
const shell = require('shelljs');
const Pm2Buttons = require('./pm2.js');
const Truncate = require('./truncate.js');
const Scripts = require('./scripts.js');
const Queries = require('./queries.js');
const config = require('../config/config.json');
const scriptConfig = require('../config/scripts.json');

module.exports = {
    listInteraction: async function listInteraction(interaction, interactionID, userPerms) {
        //Scripts
        if (userPerms.includes('scripts')) {
            if (interactionID === 'scriptList') {
                let intValues = interaction.values[0].replace(`${config.serverName}~startScript~`, '').split('~');
                let scriptName = intValues[0];
                let variableCount = intValues[1] * 1;
                for (var s in scriptConfig) {
                    if (scriptName === scriptConfig[s]['customName'] && scriptConfig[s]['fullFilePath']) {
                        Scripts.startScript(interaction, userPerms, scriptConfig[s], scriptName, variableCount);
                    }
                }
            } else if (interactionID.startsWith('runScript')) {
                if (interaction.values[0] === `${config.serverName}~cancelScript`) {
                    interaction.deferUpdate();
                    Scripts.sendScriptList(interaction, 'restart');
                } else {
                    Scripts.scriptVariables(interaction, userPerms);
                }
            }
        } //End of scripts

        //Queries
        if (userPerms.includes('queries')) {
            if (interactionID === 'countList') {
                let countType = interaction.values[0].replace(`${config.serverName}~count~`, '');
                Queries.queryCount(interaction, countType);
            }
        } //End of queries
    }, //End of listInteraction()


    buttonInteraction: async function buttonInteraction(interaction, interactionID, userPerms) {
        //PM2
        if (userPerms.includes('pm2')) {
            pm2MenuButtons = ["restart", "start", "stop"];
            if (pm2MenuButtons.includes(interactionID)) {
                interaction.deferUpdate();
                Pm2Buttons.pm2MainMenu(interaction, interactionID)
            }
            //Status menu pressed
            else if (interactionID === 'status') {
                interaction.deferUpdate();
                Pm2Buttons.updateStatus(interaction, 'edit');
            }
            //Run PM2 process
            else if (interactionID.startsWith('process~')) {
                interaction.deferUpdate();
                Pm2Buttons.runPM2(interaction, interactionID.replace('process~', ''));
            }
        } //End of pm2

        //Scripts
        if (userPerms.includes('scripts')) {
            if (interactionID.startsWith('verifyScript~')) {
                var scriptName = interaction.message.embeds[0]['title'].replace('Run script: ', '');
                //Check if admin only
                if (interaction.message.embeds[0]['title'].endsWith('🔒')) {
                    scriptName = scriptName.replace('? 🔒', '');
                    if (!userPerms.includes('admin')) {
                        console.log(`Non-admin ${interaction.user.username} tried to verify running ${scriptName}`);
                        return;
                    }
                } else {
                    scriptName = scriptName.slice(0, -1);
                }
                interaction.deferUpdate();
                let runScript = interactionID.replace('verifyScript~', '');
                if (runScript === 'no') {
                    interaction.message.edit({
                        embeds: [new MessageEmbed().setTitle('Did not run script:').setDescription(interaction.message.embeds[0]['description']).setColor('9E0000')],
                        components: []
                    }).catch(console.error);
                    setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting verify script message:", err)), 10000);
                } //End of no
                else if (runScript === 'yes') {
                    let fullBashCommand = interaction.message.embeds[0]['description'];
                    try {
                        shell.exec(fullBashCommand, function (code, output) {
                            var description = `${interaction.message.embeds[0]['description']}\n\n**Response:**\n${output}`;
                            if (code !== 0) {
                                description = `${interaction.message.embeds[0]['description']}\n\n**Error Response:**\n${output}`;
                            }
                            interaction.message.edit({
                                embeds: [new MessageEmbed().setTitle('Ran script:').setDescription(description).setColor('00841E')],
                                components: []
                            }).catch(console.error);
                            console.log(`Ran script: \`${fullBashCommand}\``);
                            if (config.scripts.scriptResponseDeleteSeconds > 0) {
                                setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting script response message:", err)), (config.scripts.scriptResponseDeleteSeconds * 1000));
                            }
                        });
                    } catch (err) {
                        interaction.message.edit({
                            embeds: [new MessageEmbed().setTitle('Failed to run script:').setDescription(interaction.message.embeds[0]['description']).setColor('9E0000')],
                            components: []
                        }).catch(console.error);
                        console.log(`Failed to run script: ${fullBashCommand}:`, err);
                        if (config.scripts.scriptResponseDeleteSeconds > 0) {
                            setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting script response message:", err)), (config.scripts.scriptResponseDeleteSeconds * 1000));
                        }
                    }
                } //End of yes
            }
        } //End of scripts

        //Truncate
        if (userPerms.includes('truncate')) {
            //Verify truncate
            if (interactionID.startsWith('verifyTruncate~')) {
                interaction.deferUpdate();
                let verify = interactionID.replace('verifyTruncate~', '');
                if (verify === 'no') {
                    interaction.message.edit({
                        embeds: [new MessageEmbed().setTitle('Did not truncate:').setDescription(interaction.message.embeds[0]['description']).setColor('9E0000')],
                        components: []
                    }).catch(console.error);
                    setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting verify truncate message:", err)), 10000);
                } //End of no
                else if (verify === 'yes') {
                    let tables = interaction.message.embeds[0]['description'].split('\n');
                    Truncate.truncateTables(interaction, interactionID, tables);
                } //End of yes
            } //End of verify truncate

            //Run truncate
            if (interactionID.startsWith('truncate~')) {
                interaction.deferUpdate();
                let buttonTables = interactionID.replace('truncate~', '');
                let tables = buttonTables.split('+');
                if (buttonTables === '!CANCEL!') {
                    setTimeout(() => interaction.message.delete().catch(err => console.log("Error deleting truncate message:", err)), 1);
                } else {
                    if (config.truncate.truncateVerify === false) {
                        Truncate.truncateTables(interaction, interactionID, tables);
                    } else {
                        Truncate.verifyTruncate(interaction, interactionID, tables);
                    }
                }
            } //End of run truncate
        } //End of truncate

    }, //End of buttonInteraction()
}