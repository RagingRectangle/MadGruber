const {
    Client,
    Intents,
    MessageEmbed,
    Permissions,
    MessageActionRow,
    MessageAttachment,
    MessageSelectMenu,
    MessageButton
} = require('discord.js');
const fs = require('fs');
const mysql = require('mysql');
const shell = require('shelljs');
const config = require('../config/config.json');

module.exports = {
    deviceControl: async function deviceControl(interaction) {
        let controlVariables = interaction.values[0].replace(`${config.serverName}~deviceControl~`, '').split('~');
        let origin = controlVariables[0];
        let controlType = controlVariables[1];
        let dcPath = config.deviceControl.path.replace('deviceControl/', 'deviceControl');
        let bashControlCommand = (`bash ${dcPath}/devicecontrol.sh ${origin} ${controlType}`).replace('//', '/');
        interaction.message.edit({
            embeds: interaction.embeds,
            components: interaction.components
        }).catch(console.error);
        interaction.message.channel.send({
                content: '**Running deviceControl script:**',
                embeds: [new MessageEmbed().setDescription(`\`${bashControlCommand}\``).setColor('0D00CA').setFooter(`${interaction.user.username}`)]
            }).catch(console.error)
            .then(async msg => {
                let logFile = [];
                shell.exec(bashControlCommand, async function (exitCode, output) {
                    var color = '00841E';
                    var description = `${origin} ${controlType}`;
                    if (exitCode !== 0) {
                        color = '9E0000';
                        description = `**${origin} ${controlType} failed**\n\n**Error Response:**\n${output}`;
                        console.log(`${interaction.user.username} failed to run devicecontrol.sh ${origin} ${controlType}`);
                    } else {
                        console.log(`${interaction.user.username} ran devicecontrol.sh ${origin} ${controlType}`);
                        if (controlType === 'pauseDevice' || controlType === 'unpauseDevice') {
                            changeIdleStatus(origin, controlType);
                        }
                    }
                    if (controlType === 'logcatDevice') {
                        fs.renameSync('./logcat.txt', `logcat_${origin}.txt`);
                        logFile.push(new MessageAttachment(`logcat_${origin}.txt`));
                    }
                    if (controlType === 'screenshot') {
                        fs.renameSync('./screenshot.jpg', `screenshot_${origin}.jpg`);
                        logFile.push(new MessageAttachment(`screenshot_${origin}.jpg`));
                    }
                    msg.edit({
                        content: '**Ran deviceControl script:**',
                        embeds: [new MessageEmbed().setDescription(description).setColor(color).setFooter(`${interaction.user.username}`)],
                    }).catch(console.error);
                    if (controlType === 'logcatDevice' && exitCode !== 1) {
                        interaction.message.channel.send({
                                files: logFile
                            }).catch(console.error)
                            .then(logcatMsg => {
                                if (config.deviceControl.logcatDeleteSeconds > 0) {
                                    setTimeout(() => logcatMsg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting logcat message:`, err)), (config.deviceControl.logcatDeleteSeconds * 1000));
                                }
                            })
                            .then(() => {
                                fs.rmSync(`logcat_${origin}.txt`);
                            });
                    }
                    if (controlType === 'screenshot' && exitCode !== 1) {
                        interaction.message.channel.send({
                                files: logFile
                            }).catch(console.error)
                            .then(logcatMsg => {
                                if (config.deviceControl.screenshotDeleteSeconds > 0) {
                                    setTimeout(() => logcatMsg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting screenshot message:`, err)), (config.deviceControl.screenshotDeleteSeconds * 1000));
                                }
                            })
                            .then(() => {
                                fs.rmSync(`screenshot_${origin}.jpg`);
                            });
                    }
                    if (config.deviceControl.controlResponseDeleteSeconds > 0) {
                        setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting deviceControl message:`, err)), (config.deviceControl.controlResponseDeleteSeconds * 1000));
                    }
                }) //End of shell.exec()
            }); //End of msg()

        async function changeIdleStatus(origin, controlType) {
            let dbInfo = require('../MAD_Database_Info.json');
            for (const [key, value] of Object.entries(dbInfo.devices)) {
                if (value.name === origin) {
                    var status = 0;
                    if (controlType === 'pauseDevice') {
                        status = 1;
                    }
                    let idleQuery = `UPDATE trs_status SET idle = ${status} WHERE device_id = ${key}`;
                    let connectionIdle = mysql.createConnection(config.madDB);
                    connectionIdle.query(idleQuery, function (err, statusResults) {
                        if (err) {
                            console.log(`Error manually updating idle status for ${origin} ${controlType}:`, err);
                        } else {
                            if (statusResults['changedRows'] == 1) {
                                //Seems like only errors should be logged for this?
                                //console.log(`Manually updated idle status for ${origin} ${statusResults}`);
                            }
                        }
                    }); //End of query
                    connectionIdle.end();
                }
            }
        } //End of changeIdleStatus()
    } //End of deviceControl()
}