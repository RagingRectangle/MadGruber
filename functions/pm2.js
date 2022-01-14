const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
    MessageActionRow,
    MessageSelectMenu,
    MessageButton
} = require('discord.js');
const pm2 = require('pm2');
const config = require('../config/config.json');

module.exports = {
    updateStatus: async function updateStatus(channelOrInteraction, type) {
        pm2.connect(async function (err) {
            if (err) {
                console.error(err)
                return;
            }
            pm2.list((err, response) => {
                if (err) {
                    console.error("pm2.list error:", err);
                    pm2.disconnect();
                    return;
                }
                var buttonList = [];
                response.forEach(process => {
                    var buttonStyle = process['status'];
                    if (buttonStyle === undefined) {
                        buttonStyle = process['pm2_env']['status']
                    }
                    buttonStyle = buttonStyle.replace('online', 'SUCCESS').replace('stopping', 'DANGER').replace('stopped', 'DANGER').replace('launching', 'SUCCESS').replace('errored', 'DANGER').replace('one-launch-status', 'DANGER');
                    let buttonLabel = process['name'];
                    let buttonID = `${config.serverName}~process~restart~${buttonLabel}`;
                    let button = new MessageButton().setCustomId(buttonID).setLabel(buttonLabel).setStyle(buttonStyle);
                    if (!config.pm2.ignore.includes(buttonLabel)) {
                        buttonList.push(button);
                    }
                }) //End of response.forEach
                buttonList.sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
                let rowsNeeded = Math.ceil(buttonList.length / 5);
                let buttonsNeeded = buttonList.length;
                var buttonCount = 0;
                var messageComponents = [];
                for (var n = 0; n < rowsNeeded && n < 4; n++) {
                    var buttonRow = new MessageActionRow()
                    for (var r = 0; r < 5; r++) {
                        if (buttonCount < buttonsNeeded) {
                            buttonRow.addComponents(buttonList[buttonCount]);
                            buttonCount++;
                        }
                    } //End of r loop
                    messageComponents.push(buttonRow);
                } //End of n loop
                pm2.disconnect();
                let optionRow = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(`${config.serverName}~restart`).setLabel(`Restart`).setStyle("PRIMARY"),
                    new MessageButton().setCustomId(`${config.serverName}~start`).setLabel(`Start`).setStyle("SUCCESS"),
                    new MessageButton().setCustomId(`${config.serverName}~stop`).setLabel(`Stop`).setStyle("DANGER"),
                    new MessageButton().setCustomId(`${config.serverName}~status`).setLabel(`Status`).setStyle("SECONDARY")
                )
                messageComponents.push(optionRow);
                if (type === 'new') {
                    channelOrInteraction.send({
                        content: `**Status of ${config.serverName} Processes:**\n*Click to restart*`,
                        components: messageComponents
                    }).catch(console.error);
                } else if (type === 'edit') {
                    channelOrInteraction.message.edit({
                        content: `**Status of ${config.serverName} Processes:**\n*Click to restart*`,
                        components: messageComponents
                    }).catch(console.error);
                }
            }) //End of pm2.list
        }) //End of pm2.connect
    }, //End of updateStatus()


    pm2MainMenu: async function pm2MainMenu(interaction, interactionID) {
        //Restart menu pressed
        if (interactionID === 'restart') {
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
            }).catch(console.error);
        }
        //Start menu pressed
        else if (interactionID === 'start') {
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
            }).catch(console.error);
        }
        //Stop menu pressed
        else if (interactionID === 'stop') {
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
            }).catch(console.error);
        }
    }, //End of pm2MainMenu


    runPM2: async function runPM2(interaction, interactionID) {
        pm2.connect(async function (err) {
            if (err) {
                console.log(`(${interaction.user.username}) pm2.connect error:`, err);
            } else {
                if (interactionID.startsWith('restart~')) {
                    let processName = interactionID.replace('restart~', '');
                    pm2.restart(processName, (err, response) => {
                        if (err) {
                            console.log(`${interaction.user.username} failed to restart ${processName} PM2 process.`, err);
                            interaction.message.channel.send({
                                    embeds: [new MessageEmbed().setDescription(`Failed to restart ${processName} process.`).setColor('9E0000').setFooter(`${interaction.user.username}`)],
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.pm2.pm2MessageDeleteSeconds > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 restart response:`, err)), (config.pm2.pm2MessageDeleteSeconds * 1000));
                                    }
                                });
                        } else {
                            console.log(`${processName} restarted by ${interaction.user.username}`);
                            interaction.message.channel.send({
                                    embeds: [new MessageEmbed().setDescription(`PM2 process restarted: ${processName}`).setColor('00841E').setFooter(`${interaction.user.username}`)],
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.pm2.pm2MessageDeleteSeconds > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 restart response:`, err)), (config.pm2.pm2MessageDeleteSeconds * 1000));
                                    }
                                });
                        }
                    });
                } else if (interactionID.startsWith('start~')) {
                    let processName = interactionID.replace('start~', '');
                    pm2.start(processName, (err, response) => {
                        if (err) {
                            console.log(`${interaction.user.username} failed to start ${processName} PM2 process.`, err);
                            interaction.message.channel.send({
                                    embeds: [new MessageEmbed().setDescription(`Failed to start ${processName} process.`).setColor('9E0000').setFooter(`${interaction.user.username}`)],
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.pm2.pm2MessageDeleteSeconds > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 start response:`, err)), (config.pm2.pm2MessageDeleteSeconds * 1000));
                                    }
                                });
                        } else {
                            console.log(`${processName} started by ${interaction.user.username}`);
                            interaction.message.channel.send({
                                    embeds: [new MessageEmbed().setDescription(`PM2 process started: ${processName}`).setColor('00841E').setFooter(`${interaction.user.username}`)],
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.pm2.pm2MessageDeleteSeconds > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 start response:`, err)), (config.pm2.pm2MessageDeleteSeconds * 1000));
                                    }
                                });
                        }
                    });
                } else if (interactionID.startsWith('stop~')) {
                    let processName = interactionID.replace('stop~', '');
                    pm2.stop(processName, (err, response) => {
                        if (err) {
                            console.log(`${interaction.user.username} failed to stop ${processName} PM2 process.`, err);
                            interaction.message.channel.send({
                                    embeds: [new MessageEmbed().setDescription(`Failed to stop ${processName} PM2 process.`).setColor('9E0000').setFooter(`${interaction.user.username}`)],
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.pm2.pm2MessageDeleteSeconds > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 stop response:`, err)), (config.pm2.pm2MessageDeleteSeconds * 1000));
                                    }
                                });
                        } else {
                            console.log(`${processName} stopped by ${interaction.user.username}`);
                            interaction.message.channel.send({
                                    embeds: [new MessageEmbed().setDescription(`PM2 process stopped: ${processName}`).setColor('00841E').setFooter(`${interaction.user.username}`)],
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.pm2.pm2MessageDeleteSeconds > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting PM2 stop response:`, err)), (config.pm2.pm2MessageDeleteSeconds * 1000));
                                    }
                                });
                        }
                    });
                }
            }
        }) //End of pm2.connect
        pm2.disconnect();
    } //End of runPM2()
}