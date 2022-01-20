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
const mysql = require('mysql');
const moment = require('moment');
const config = require('../config/config.json');
const dbInfo = require('../MAD_Database_Info.json');

module.exports = {
    deviceStatus: async function deviceStatus(receivedMessage) {
        console.log(`${receivedMessage.author.username} requested the status of all devices`);
        let connection = mysql.createConnection(config.madDB);
        let statusQuery = `SELECT * FROM trs_status`;
        connection.query(statusQuery, function (err, results) {
            if (err) {
                console.log("Status Query Error:", err);
            } else {
                var instanceList = [];
                var sortBy = require('sort-by'),
                    buttonArray = [];
                //var buttonArray = [];
                results.forEach(device => {
                    instanceList.push(dbInfo.instances[device.instance_id]);
                    let minutesSinceSeen = ((Math.abs(Date.now() - Date.parse(device.lastProtoDateTime)) / (1000 * 3600)) * 60).toFixed(0);
                    var deviceName = dbInfo.devices[device.device_id]['name'];
                    for (var b = 0; b < config.devices.buttonLabelRemove.length; b++) {
                        let remove = config.devices.buttonLabelRemove[b];
                        if (deviceName.includes(remove)) {
                            deviceName = deviceName.replace(remove, '');
                            break;
                        }
                    } //End of b loop
                    var buttonLabel = deviceName;
                    var buttonStyle = 'SUCCESS';
                    //If idle
                    if (device.idle === 1) {
                        buttonStyle = 'PRIMARY';
                        //If paused
                        if (dbInfo.areas[device.area_id]['mode'] !== 'idle') {
                            buttonStyle = 'SECONDARY';
                            buttonLabel = `${deviceName} (${minutesSinceSeen}m)`;
                        }
                    } else if (minutesSinceSeen > config.devices.noProtoMinutes) {
                        buttonStyle = 'DANGER';
                    }
                    if (minutesSinceSeen > config.devices.noProtoMinutes) {
                        buttonLabel = `${deviceName} (${minutesSinceSeen}m)`;
                        if (Math.round(minutesSinceSeen) > 119) {
                            let hoursSince = (Math.round(minutesSinceSeen) / 60).toFixed(0);
                            buttonLabel = `${deviceName} (${hoursSince}h)`;
                            if (hoursSince > 47) {
                                let daysSince = (Math.round(hoursSince / 24)).toFixed(0);
                                buttonLabel = `${deviceName} (${daysSince}d)`;
                            }
                        }
                    }
                    let buttonID = `${config.serverName}~deviceInfo~${device.device_id}`;
                    let button = new MessageButton().setCustomId(buttonID).setLabel(buttonLabel).setStyle(buttonStyle);
                    let buttonObj = {
                        name: deviceName,
                        instance: dbInfo.instances[device.instance_id],
                        button: button
                    }
                    buttonArray.push(buttonObj);
                }); //End of forEach
                instanceList = Array.from(new Set(instanceList));
                buttonArray.sort(sortBy('name'));
                //Split by instance
                instanceList.forEach(instance => {
                    var content = `**Status of ${instance} devices:**`;
                    var instanceButtons = [];
                    buttonArray.forEach(buttonObj => {
                        if (instance === buttonObj.instance) {
                            instanceButtons.push(buttonObj.button);
                        }
                    }) //End of forEach(buttonObj)
                    let messagesNeeded = Math.ceil(instanceButtons.length / 25);
                    for (var m = 0; m < messagesNeeded; m++) {
                        let buttonsNeeded = Math.min(25, instanceButtons.length);
                        let rowsNeeded = Math.ceil(buttonsNeeded / 5);
                        var buttonCount = 0;
                        var messageComponents = [];

                        for (var n = 0; n < rowsNeeded && n < 4; n++) {
                            var buttonRow = new MessageActionRow();
                            for (var r = 0; r < 5; r++) {
                                if (buttonCount < buttonsNeeded) {
                                    buttonRow.addComponents(instanceButtons[buttonCount]);
                                    buttonCount++;
                                }
                            } //End of r loop
                            messageComponents.push(buttonRow);
                        } //End of n loop
                        receivedMessage.channel.send({
                                content: content,
                                components: messageComponents
                            }).catch(console.error)
                            .then(msg => {
                                if (config.devices.statusButtonsDeleteMinutes > 0) {
                                    setTimeout(() => msg.delete().catch(err => console.log(`Error deleting device status message:`, err)), (config.devices.statusButtonsDeleteMinutes * 1000 * 60));
                                }
                            })
                        content = '‎';
                        let tempButtons = instanceButtons.slice(25);
                        instanceButtons = tempButtons;
                    } //End of message m loop
                }) //End of forEach(instance)
            }
        }); //End of query
        connection.end();
    }, //End of deviceStatus()

    getDeviceInfo: async function getDeviceInfo(interaction, deviceID) {
        let connection = mysql.createConnection(config.madDB);
        let deviceQuery = `SELECT * FROM trs_status WHERE device_id = "${deviceID}"`;
        connection.query(deviceQuery, function (err, deviceResults) {
            if (err) {
                console.log("Device Info Query Error:", err);
            } else {
                parseDeviceInfo(deviceResults[0]);
            }
        }) //End of query
        connection.end();

        async function parseDeviceInfo(device) {
            let lastSeen = `**- Last Seen:** ${moment(device.lastProtoDateTime).from(moment().add(config.timezoneOffsetHours * 1, 'hours'))}\n`;
            let timeDiffLastSeen = Math.abs(Date.now() - Date.parse(device.lastProtoDateTime));
            let hoursSinceLastSeen = timeDiffLastSeen / (1000 * 3600) + config.timezoneOffsetHours;
            let minutesSinceLastSeen = (hoursSinceLastSeen * 60).toFixed(2);
            let area = `**- Area:** ${dbInfo.areas[device.area_id]['name']} (${dbInfo.areas[device.area_id]['mode']})\n`;
            var paused = deviceID = instance = restartInfo = rebootInfo = loginInfo = '';
            //Running well
            var color = '00841E';
            //If idle
            if (device.idle == 1) {
                color = '5865F2';
                //If paused
                if (dbInfo.areas[device.area_id]['mode'] !== 'idle') {
                    color = '696969';
                    paused = '**- Paused:** true\n';
                }
            } else if (minutesSinceLastSeen > config.devices.noProtoMinutes) {
                color = '9E0000';
            }
            if (config.devices.displayOptions.deviceID === true) {
                deviceID = `**- DeviceID:** ${device.device_id}\n`;
            }
            if (config.devices.displayOptions.instance === true) {
                instance = `**- Instance:** ${dbInfo.instances[device.instance_id]}\n`;
            }
            if (config.devices.displayOptions.restartInfo === true) {
                restartInfo = `**- Last Restart:** ${moment(device.lastPogoRestart).from(moment())}\n**- Restart Count:** ${device.globalrestartcount}\n`;
            }
            if (config.devices.displayOptions.rebootInfo === true) {
                rebootInfo = `**- Last Reboot:** ${moment(device.lastPogoReboot).from(moment())}\n**- Reboot Count:** ${device.globalrebootcount}\n`;
            }
            if (config.devices.displayOptions.loginInfo === true) {
                loginInfo = `**- Login Type:** ${dbInfo.devices[device.device_id]['loginType']}\n**- Login Account:** ${dbInfo.devices[device.device_id]['loginAccount']}`;
            }
            let description = `${deviceID}${instance}${paused}${area}${lastSeen}${restartInfo}${rebootInfo}${loginInfo}`;
            interaction.message.channel.send({
                    embeds: [new MessageEmbed().setTitle(`${dbInfo.devices[device.device_id]['name']} Info:`).setDescription(`${description}`).setColor(color).setFooter(`${interaction.user.username}`)],
                    components: []
                }).catch(console.error)
                .then(msg => {
                    if (config.devices.infoMessageDeleteSeconds > 0) {
                        setTimeout(() => msg.delete().catch(err => console.log(`Error deleting ${dbInfo.devices[device.device_id]['name']} device message:`, err)), (config.devices.infoMessageDeleteSeconds * 1000));
                    }
                })
        } //End of parseDeviceInfo()
    }, //End of getDeviceInfo()
}