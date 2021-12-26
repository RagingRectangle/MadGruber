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
        //Check if file exists
        let tempPath = script.fullFilePath.split(' ');
        let fileTest = fileExists.sync(tempPath[0]);
        if (fileTest === false) {
            module.exports.sendScriptList(interaction, "restart");
            interaction.deferUpdate();
            console.log(`Script not found: \`${tempPath[0]}\``);
            interaction.message.channel.send(`Script not found: \`${tempPath[0]}\``);
            return;
        }

        //No variables
        if (variableCount == 0) {
            module.exports.runScript(interaction, scriptName, '');
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
                let bashVariables = variable;
                let listOption = {
                    label: variable,
                    value: `${config.serverName}~run:${scriptName}~var:1_${variableCount}~${bashVariables}`
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
        var bashVariables = intItems[2].split('^');

        //No more variables needed
        if (varCounter[0] == varCounter[1]) {
            module.exports.runScript(interaction, scriptName, bashVariables);
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
                        let newbashVariables = `${bashVariables} ${variable}`;
                        let listOption = {
                            label: variable,
                            value: `${config.serverName}~run:${scriptName}~var:${varNumber}_${varNeeded}~${newbashVariables}`
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


    runScript: async function runScript(interaction, scriptName, variables) {
        interaction.deferUpdate();
        module.exports.sendScriptList(interaction, "restart");
        var fullBashCommand = '';
        for (var s in scriptList) {
            if (scriptList[s]['customName'] === scriptName) {
                fullBashCommand = `bash ${scriptList[s]['fullFilePath']} ${variables}`;
                console.log("fullBash:", fullBashCommand);
            }
        } //End of s loop
        if (fullBashCommand !== ''){
            try {
                let output = shell.exec(fullBashCommand, {
                    silent: false,
                    async: true
                })
                interaction.message.channel.send(`Ran script: \`${fullBashCommand}\``);
                console.log(`Ran script: \`${fullBashCommand}\``);
            } catch (err) {
                interaction.message.channel.send(`Failed to run script: \`${fullBashCommand}\``);
                console.log(`Failed to run script: ${fullBashCommand}:`, err);
            }
        }
    }, //End of runScript()
}