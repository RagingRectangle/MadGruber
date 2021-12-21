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
const fileExists = require('file-exists');
const config = require('../config/config.json');
const scriptList = require('../config/scripts.json');
const shell = require('shelljs');

module.exports = {
    sendScriptList: async function sendScriptList(messageOrInteraction, type) {
        var selectList = [];
        scriptList.forEach(script => {
            if (script.fullFilePath !== '') {
                let listOption = {
                    label: script.customName,
                    description: script.description,
                    value: `${config.serverName}~startScript~${script.customName}~${script.variables.length}`
                }
                selectList.push(listOption);
            }
        });
        let fullList = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                .setCustomId(`${config.serverName}~scriptList`)
                .setPlaceholder('List of Scripts')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(selectList))

        if (type === 'new') {
            messageOrInteraction.channel.send({
                content: 'Select a script below to run it.',
                components: [fullList]
            });
        } else if (type === 'restart') {
            messageOrInteraction.message.edit({
                content: 'Select a script below to run it.',
                components: [fullList]
            });
        }
    }, //End of sendScriptList()


    startScript: async function startScript(interaction, script, scriptName, variableCount) {
        //console.log("script:", script);
        //No variables
        if (variableCount == 0) {
            let bashCommand = `bash ${script.fullFilePath}`;
            module.exports.runScript(interaction, bashCommand);
        }
        //Has variables
        else {
            interaction.deferUpdate();
            let currentVar = script.variables[0];
            let varDescription = currentVar['varDescription'];
            let varOptions = currentVar['varOptions'];
            var selectList = [];
            let cancelOption = {
                label: "CANCEL SCRIPT",
                value: `${config.serverName}~cancelScript`
            }
            selectList.push(cancelOption);
            varOptions.forEach(variable => {
                let bashCommand = `bash ${script.fullFilePath} ${variable}`;
                let listOption = {
                    label: variable,
                    value: `${config.serverName}~run:${scriptName}~var:1_${variableCount}~bash:${bashCommand}`
                }
                selectList.push(listOption);
            });
            let fullList = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                    .setCustomId(`${config.serverName}~runScript`)
                    .setPlaceholder(varDescription)
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(selectList))

            interaction.message.edit({
                content: `Select variable 1 of ${variableCount} for ${script.customName}`,
                components: [fullList]
            })
        } //End of has variables
    }, //End of startScript()


    scriptVariables: async function scriptVariables(interaction) {
        let intItems = interaction.values[0].replace(`${config.serverName}~run:`, '').split('~');
        //console.log("intItems:", intItems);
        let scriptName = intItems[0];
        let varCounter = intItems[1].replace('var:', '').split('_');
        let varNumber = varCounter[0] * 1 + 1;
        let varNeeded = varCounter[1] * 1;
        var bashCommand = intItems[2].replace('bash:', '');

        //No more variables needed
        if (varCounter[0] == varCounter[1]) {
            module.exports.runScript(interaction, bashCommand);
        }
        //More variables needed
        else {
            for (var s in scriptList) {
                if (scriptList[s]['customName'] === scriptName) {
                    interaction.deferUpdate();
                    let script = scriptList[s];
                    let currentVar = script.variables[varNumber - 1];
                    let varDescription = currentVar['varDescription'];
                    let varOptions = currentVar['varOptions'];
                    var selectList = [];
                    let cancelOption = {
                        label: "CANCEL SCRIPT",
                        value: `${config.serverName}~cancelScript`
                    }
                    selectList.push(cancelOption);
                    varOptions.forEach(variable => {
                        let newBashCommand = `${bashCommand} ${variable}`;
                        let listOption = {
                            label: variable,
                            value: `${config.serverName}~run:${scriptName}~var:${varNumber}_${varNeeded}~bash:${newBashCommand}`
                        }
                        selectList.push(listOption);
                    });
                    let fullList = new MessageActionRow()
                        .addComponents(
                            new MessageSelectMenu()
                            .setCustomId(`${config.serverName}~runScript`)
                            .setPlaceholder(varDescription)
                            .setMinValues(1)
                            .setMaxValues(1)
                            .addOptions(selectList))

                    interaction.message.edit({
                        content: `Select variable ${varNumber} of ${varNeeded} for ${scriptName}`,
                        components: [fullList]
                    })
                    break;
                }
            } //End of s loop
        } //End of more variables needed
    }, //End of scriptVariables()


    runScript: async function runScript(interaction, bashCommand) {
        interaction.deferUpdate();
        module.exports.sendScriptList(interaction, "restart");
        let splitCommand = bashCommand.split(' ');
        console.log(bashCommand)
        let filePath = splitCommand[1];

        let fileTest = fileExists.sync(filePath);
        if (fileTest === false) {
            console.log(`Script not found: \`${filePath}\``);
            interaction.message.channel.send(`Script not found: \`${filePath}\``);
        } else {
            try {
                let output = shell.exec(bashCommand, {
                    silent: false,
                    async: true
                })
                interaction.message.channel.send(`Ran script: \`${bashCommand}\``);
                console.log(`Ran script: \`${bashCommand}\``);
            } catch (err) {
                interaction.message.channel.send(`Failed to run script: \`${bashCommand}\``);
                console.log(`Failed to run script: ${bashCommand}:`, err);
            }
        }
    }, //End of runScript()
}