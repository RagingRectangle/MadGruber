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
const ansiParser = require("ansi-parser");

module.exports = {
   sendScriptList: async function sendScriptList(messageOrInteraction, type) {
      var selectList = [];
      scriptList.forEach(script => {
         if (script.fullFilePath !== '') {
            var label = script.customName;
            if (script.adminOnly === true) {
               label = label.concat(' 🔒');
            }
            let listOption = {
               label: label,
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
            .addOptions(selectList))
      if (type === 'new') {
         if (selectList.length == 0) {
            messageOrInteraction.channel.send({
               embeds: [new MessageEmbed().setDescription("Error: No scripts found in scripts.json").setColor('9E0000')]
            }).catch(console.error);
            return;
         }
         messageOrInteraction.channel.send({
            content: 'Select a script below to run it.',
            components: [fullList]
         }).catch(console.error);
      } else if (type === 'restart') {
         messageOrInteraction.message.edit({
            content: 'Select a script below to run it.',
            embeds: [],
            components: [fullList]
         }).catch(console.error);
      }
   }, //End of sendScriptList()


   startScript: async function startScript(interaction, userPerms, script, scriptName, variableCount) {
      //Check if admin only
      if (script.adminOnly === true && !userPerms.includes('admin')) {
         console.log(`Non-admin ${interaction.user.username} tried running ${scriptName}`);
         return;
      }
      //Check if file exists
      let tempPath = script.fullFilePath.split(' ');
      let fileTest = fileExists.sync(tempPath[0]);
      if (fileTest === false) {
         module.exports.sendScriptList(interaction, "restart");
         interaction.deferUpdate();
         console.log(`(${interaction.user.username}) Script not found: \`${tempPath[0]}\``);
         interaction.message.channel.send(`Script not found: \`${tempPath[0]}\``).catch(console.error);
         return;
      }
      //No variables
      if (variableCount == 0) {
         if (config.scripts.scriptVerify === false) {
            module.exports.runScript(interaction, scriptName, '');
         } else {
            module.exports.verifyScript(interaction, scriptName, '');
         }
      }
      //Has variables
      else {
         interaction.deferUpdate();
         let currentVar = script.variables[0];
         let varDescription = currentVar['varDescription'];
         let varOptions = currentVar['varOptions'];
         var selectList = [];
         varOptions.forEach(variable => {
            let bashVariables = variable;
            let listOption = {
               label: variable,
               value: `${config.serverName}~run:${scriptName}~var:1_${variableCount}~${bashVariables}`
            }
            selectList.push(listOption);
         });
         let listsNeeded = Math.ceil(varOptions.length / 24);
         var varCounter = 0;
         var allComponents = [];
         for (var n = 0; n < listsNeeded && n < 5; n++) {
            var currentList = [];
            let cancelOption = {
               label: "CANCEL SCRIPT",
               value: `${config.serverName}~cancelScript`
            }
            currentList.push(cancelOption);
            var optionCounter = 0;
            for (var v = varCounter; v < varOptions.length && optionCounter < 24; v++) {
               currentList.push(selectList[v]);
               optionCounter++;
               varCounter++;
            } //End of v loop
            let fullList = new MessageActionRow()
               .addComponents(
                  new MessageSelectMenu()
                  .setCustomId(`${config.serverName}~runScript${n}`)
                  .setPlaceholder(`${varDescription}`)
                  .addOptions(currentList))
            if (listsNeeded > 1) {
               fullList.components[0].setPlaceholder(`${varDescription} (${currentList[1]['label']} - ${currentList[currentList.length - 1]['label']})`)
            }
            allComponents.push(fullList);
         } //End of n loop
         interaction.message.edit({
            content: `Select variable 1 of ${variableCount} for ${script.customName}`,
            components: allComponents
         }).catch(console.error);
      } //End of has variables
   }, //End of startScript()


   scriptVariables: async function scriptVariables(interaction, userPerms) {
      let intItems = interaction.values[0].replace(`${config.serverName}~run:`, '').split('~');
      let scriptName = intItems[0];
      let currentVarCounts = intItems[1].replace('var:', '').split('_');
      let varNumber = currentVarCounts[0] * 1 + 1;
      let varNeeded = currentVarCounts[1] * 1;
      var bashVariables = intItems[2].split('^');
      for (var s in scriptList) {
         if (scriptList[s]['customName'] === scriptName) {
            let script = scriptList[s];
            //Check if admin only
            if (script.adminOnly === true && !userPerms.includes('admin')) {
               console.log(`Non-admin ${interaction.user.username} tried selecting variable for ${scriptName}`);
               return;
            }
            //No more variables needed
            if (currentVarCounts[0] == currentVarCounts[1]) {
               if (config.scripts.scriptVerify === false) {
                  module.exports.runScript(interaction, scriptName, bashVariables);
               } else {
                  module.exports.verifyScript(interaction, scriptName, bashVariables);
               }
            } else {
               interaction.deferUpdate();
               let currentVar = script.variables[varNumber - 1];
               let varDescription = currentVar['varDescription'];
               let varOptions = currentVar['varOptions'];
               var selectList = [];
               varOptions.forEach(variable => {
                  let newbashVariables = `${bashVariables} ${variable}`;
                  let listOption = {
                     label: variable,
                     value: `${config.serverName}~run:${scriptName}~var:${varNumber}_${varNeeded}~${newbashVariables}`
                  }
                  selectList.push(listOption);
               });
               let listsNeeded = Math.ceil(varOptions.length / 24);
               var varCounter = 0;
               var allComponents = [];
               for (var n = 0; n < listsNeeded && n < 5; n++) {
                  var currentList = [];
                  let cancelOption = {
                     label: "CANCEL SCRIPT",
                     value: `${config.serverName}~cancelScript`
                  }
                  currentList.push(cancelOption);
                  var optionCounter = 0;
                  for (var v = varCounter; v < varOptions.length && optionCounter < 24; v++) {
                     currentList.push(selectList[v]);
                     optionCounter++;
                     varCounter++;
                  } //End of v loop
                  let fullList = new MessageActionRow()
                     .addComponents(
                        new MessageSelectMenu()
                        .setCustomId(`${config.serverName}~runScript_var${varCounter}`)
                        .setPlaceholder(`${varDescription}`)
                        .addOptions(currentList))
                  if (listsNeeded > 1) {
                     fullList.components[0].setPlaceholder(`${varDescription} (${currentList[1]['label']} - ${currentList[currentList.length - 1]['label']})`)
                  }
                  allComponents.push(fullList);
               } //End of n loop
               interaction.message.edit({
                  content: `Select variable ${varNumber} of ${varNeeded} for ${scriptName}`,
                  components: allComponents
               }).catch(console.error);
               break;
            } //End of more variables needed
         } //End of = scriptName 
      } //End of s loop
   }, //End of scriptVariables()


   verifyScript: async function verifyScript(interaction, scriptName, variables) {
      interaction.deferUpdate();
      for (var s in scriptList) {
         if (scriptList[s]['customName'] === scriptName) {
            let optionRow = new MessageActionRow().addComponents(
               new MessageButton().setCustomId(`${config.serverName}~verifyScript~yes`).setLabel(`Yes`).setStyle("SUCCESS"),
               new MessageButton().setCustomId(`${config.serverName}~verifyScript~no`).setLabel(`No`).setStyle("DANGER")
            )
            var title = `**Run script: ${scriptName}?**`;
            if (scriptList[s]['adminOnly'] === true) {
               title = title.concat(' 🔒');
            }
            interaction.message.edit({
               content: title,
               embeds: [new MessageEmbed().setDescription(`bash ${scriptList[s]['fullFilePath']} ${variables}`).setColor('0D00CA').setFooter({
                  text: `${interaction.user.username}`
               })],
               components: [optionRow]
            }).catch(console.error);
         }
      } //End of s loop
   }, //End of verifyScript()


   runScript: async function runScript(interaction, scriptName, variables) {
      interaction.deferUpdate();
      var fullBashCommand = '';
      for (var s in scriptList) {
         if (scriptList[s]['customName'] === scriptName) {
            fullBashCommand = `bash ${scriptList[s]['fullFilePath']} ${variables}`;
         }
      } //End of s loop
      if (fullBashCommand !== '') {
         interaction.message.edit({
            content: '**Running script:**',
            embeds: [new MessageEmbed().setDescription(`\`${fullBashCommand}\``).setColor('0D00CA').setFooter({
               text: `${interaction.user.username}`
            })],
            components: []
         }).catch(console.error);
         try {
            shell.exec(fullBashCommand, function (exitCode, output) {
               module.exports.sendScriptList(interaction, "restart");
               var color = '00841E';
               var description = `\`${fullBashCommand}\`\n\n**Response:**\n${ansiParser.removeAnsi(output).replaceAll('c','')}`;
               if (exitCode !== 0) {
                  color = '9E0000';
                  description = `\`${fullBashCommand}\`\n\n**Error Response:**\n${ansiParser.removeAnsi(output).replaceAll('c','')}`;
               }
               console.log(`${interaction.user.username} ran script: \`${fullBashCommand}\``);

               interaction.message.channel.send({
                     embeds: [new MessageEmbed().setTitle('Ran script:').setDescription(description).setColor(color).setFooter({
                        text: `${interaction.user.username}`
                     })],
                  }).catch(console.error)
                  .then(msg => {
                     if (config.scripts.scriptResponseDeleteSeconds > 0) {
                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting script response message:`, err)), (config.scripts.scriptResponseDeleteSeconds * 1000));
                     }
                  })
            })
         } catch (err) {
            console.log(`Failed to run script: ${fullBashCommand}:`, err);
            module.exports.sendScriptList(interaction, "restart");
            interaction.message.channel.send({
                  embeds: [new MessageEmbed().setTitle('Failed to run script:').setDescription(fullBashCommand).setColor('9E0000').setFooter({
                     text: `${interaction.user.username}`
                  })],
               }).catch(console.error)
               .then(msg => {
                  if (config.scripts.scriptResponseDeleteSeconds > 0) {
                     setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting script response message:`, err)), (config.scripts.scriptResponseDeleteSeconds * 1000));
                  }
               })
         }
      }
   }, //End of runScript()
}