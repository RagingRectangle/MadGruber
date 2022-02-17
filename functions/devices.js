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

module.exports = {
    deviceStatus: async function deviceStatus(receivedMessage) {
        let dbInfo = require('../MAD_Database_Info.json');
        console.log(`${receivedMessage.author.username} requested the status of all devices`);
        let connectionMAD = mysql.createConnection(config.madDB);
        let statusQuery = `SELECT * FROM trs_status`;
        connectionMAD.query(statusQuery, function (err, results) {
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
                    var content = `**Status of ${instance} Devices:**`;
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
                        for (var n = 0; n < rowsNeeded && n < 5; n++) {
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
        connectionMAD.end();
    }, //End of deviceStatus()

    noProtoDevices: async function noProtoDevices(client, receivedMessage, type) {
        if (type === 'cron' && !config.devices.noProtoChannelID) {
            console.log("Error: 'noProtoChannelID' not set in config.json");
        }
        let dbInfo = require('../MAD_Database_Info.json');
        if (type === 'search') {
            console.log(`${receivedMessage.author.username} requested the status of all noProto devices`);
        }
        let connectionMAD = mysql.createConnection(config.madDB);
        let statusQuery = `SELECT * FROM trs_status`;
        connectionMAD.query(statusQuery, function (err, results) {
            if (err) {
                console.log("noProto Status Query Error:", err);
            } else {
                var instanceList = [];
                var sortBy = require('sort-by'),
                    buttonArray = [];
                results.forEach(device => {
                    let minutesSinceSeen = ((Math.abs(Date.now() - Date.parse(device.lastProtoDateTime)) / (1000 * 3600)) * 60).toFixed(0);
                    var deviceName = dbInfo.devices[device.device_id]['name'];
                    for (var b = 0; b < config.devices.buttonLabelRemove.length; b++) {
                        let remove = config.devices.buttonLabelRemove[b];
                        if (deviceName.includes(remove)) {
                            deviceName = deviceName.replace(remove, '');
                            break;
                        }
                    } //End of b loop
                    if (minutesSinceSeen > config.devices.noProtoMinutes) {
                        instanceList.push(dbInfo.instances[device.instance_id]);
                        var buttonStyle = 'DANGER';
                        //If idle
                        if (device.idle === 1) {
                            buttonStyle = 'PRIMARY';
                            //If paused
                            if (dbInfo.areas[device.area_id]['mode'] !== 'idle') {
                                buttonStyle = 'SECONDARY';
                            }
                        }
                        var buttonLabel = `${deviceName} (${minutesSinceSeen}m)`;
                        if (Math.round(minutesSinceSeen) > 119) {
                            let hoursSince = (Math.round(minutesSinceSeen) / 60).toFixed(0);
                            buttonLabel = `${deviceName} (${hoursSince}h)`;
                            if (hoursSince > 47) {
                                let daysSince = (Math.round(hoursSince / 24)).toFixed(0);
                                buttonLabel = `${deviceName} (${daysSince}d)`;
                            }
                        }
                        var buttonID = `${config.serverName}~deviceInfo~${device.device_id}`;
                        let button = new MessageButton().setCustomId(buttonID).setLabel(buttonLabel).setStyle(buttonStyle);
                        let buttonObj = {
                            name: deviceName,
                            instance: dbInfo.instances[device.instance_id],
                            button: button
                        }
                        if (type === "search") {
                            buttonArray.push(buttonObj);
                        } else {
                            if (device.idle != 1) {
                                buttonArray.push(buttonObj);
                            } else if (config.devices.noProtoIncludeIdle === true) {
                                buttonArray.push(buttonObj);
                            }
                        }
                    } //End of noProto breach
                }); //End of forEach(device)
                instanceList = Array.from(new Set(instanceList));
                buttonArray.sort(sortBy('name'));
                //Split by instance
                instanceList.forEach(async instance => {
                    var instanceButtons = [];
                    var noProtoCount = 0;
                    buttonArray.forEach(buttonObj => {
                        if (instance === buttonObj.instance) {
                            instanceButtons.push(buttonObj.button);
                            noProtoCount++;
                        }
                    }) //End of forEach(buttonObj)
                    let messagesNeeded = Math.ceil(instanceButtons.length / 25);
                    for (var m = 0; m < messagesNeeded; m++) {
                        let buttonsNeeded = Math.min(25, instanceButtons.length);
                        let rowsNeeded = Math.ceil(buttonsNeeded / 5);
                        var buttonCount = 0;
                        var messageComponents = [];
                        for (var n = 0; n < rowsNeeded && n < 5; n++) {
                            var buttonRow = new MessageActionRow();
                            for (var r = 0; r < 5; r++) {
                                if (buttonCount < buttonsNeeded) {
                                    buttonRow.addComponents(instanceButtons[buttonCount]);
                                    buttonCount++;
                                }
                            } //End of r loop
                            messageComponents.push(buttonRow);
                        } //End of n loop
                        let content = `**${instance}: ${noProtoCount} No Proto Devices:**`;
                        if (type === 'search') {
                            receivedMessage.channel.send({
                                    content: content,
                                    components: messageComponents
                                }).catch(console.error)
                                .then(msg => {
                                    if (config.devices.statusButtonsDeleteMinutes > 0) {
                                        setTimeout(() => msg.delete().catch(err => console.log(`Error deleting noProto status message:`, err)), (config.devices.statusButtonsDeleteMinutes * 1000 * 60));
                                    }
                                })
                        } //End of search
                        else if (type === 'cron') {
                            try {
                                let postChannel = await client.channels.fetch(config.devices.noProtoChannelID);
                                postChannel.send({
                                        content: content,
                                        components: messageComponents
                                    }).catch(console.error)
                                    .then(msg => {
                                        if (config.devices.checkDeleteMinutes > 0) {
                                            setTimeout(() => msg.delete().catch(err => console.log(`Error deleting noProto check message:`, err)), (config.devices.checkDeleteMinutes * 1000 * 60));
                                        }
                                    })
                            } catch (err) {
                                console.log("Failed to fetch noProto post channel:", err);
                            }
                        } //End of cron
                        content = '‎';
                        let tempButtons = instanceButtons.slice(25);
                        instanceButtons = tempButtons;
                    } //End of message m loop
                }); //End of forEach(instance)
                if (instanceList.length == 0 && type == "search") {
                    receivedMessage.channel.send("No problems detected!")
                        .catch(console.error)
                        .then(msg => {
                            if (config.devices.statusButtonsDeleteMinutes > 0) {
                                setTimeout(() => msg.delete().catch(err => console.log(`Error deleting noProto status message:`, err)), (config.devices.statusButtonsDeleteMinutes * 1000 * 60));
                            }
                        })
                }
            }
        }); //End of query
        connectionMAD.end();
    }, //End of noProtoDevices()

    getDeviceInfo: async function getDeviceInfo(type, typeData, deviceID) {
        var channel, user;
        if (type === "interaction") {
            channel = typeData.message.channel;
            user = typeData.user.username;
        } else if (type === "search") {
            channel = typeData.channel;
            user = typeData.author.username;
        } else {
            return;
        }
        let dbInfo = require('../MAD_Database_Info.json');
        let connectionMAD = mysql.createConnection(config.madDB);
        let deviceQuery = `SELECT * FROM trs_status WHERE device_id = "${deviceID}"`;
        connectionMAD.query(deviceQuery, function (err, deviceResults) {
            if (err) {
                console.log("Device Info Query Error:", err);
            } else {
                parseDeviceInfo(deviceResults[0]);
            }
        }); //End of query
        connectionMAD.end();
        async function parseDeviceInfo(device) {
            let timeDiffLastSeen = Math.abs(Date.now() - Date.parse(device.lastProtoDateTime));
            let hoursSinceLastSeen = timeDiffLastSeen / (1000 * 3600);
            let minutesSinceLastSeen = (hoursSinceLastSeen * 60).toFixed(2);
            var paused = '';
            let origin = dbInfo.devices[device.device_id]['name'];
            var deviceInfoArray = [];
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
            deviceInfoArray.push(`**area:** ${dbInfo.areas[device.area_id]['name']} (${dbInfo.areas[device.area_id]['mode']})`);
            deviceInfoArray.push(`**last seen:** ${moment(device.lastProtoDateTime).from(moment())}`);
            if (config.devices.displayOptions.restartInfo === true) {
                deviceInfoArray.push(`**last restart:** ${moment(device.lastPogoRestart).from(moment())} (#${device.globalrestartcount})`);
            }
            if (config.devices.displayOptions.rebootInfo === true) {
                deviceInfoArray.push(`**last reboot:** ${moment(device.lastPogoReboot).from(moment())} (#${device.globalrebootcount})`);
            }
            let cycleStatPosition = deviceInfoArray.length;
            if (config.devices.displayOptions.deviceID === true) {
                deviceInfoArray.push(`**deviceID:** ${device.device_id}`);
            }
            if (config.devices.displayOptions.instance === true) {
                deviceInfoArray.push(`**instance:** ${dbInfo.instances[device.instance_id]}`);
            }
            if (config.devices.displayOptions.loginInfo === true) {
                deviceInfoArray.push(`**login type:** ${dbInfo.devices[device.device_id]['loginType']}\n- **login account:** ${dbInfo.devices[device.device_id]['loginAccount']}`);
            }
            if (!config.stats.database.host) {
                sendDeviceInfo(origin, color, deviceInfoArray, '');
            } else {
                let connectionDeviceInfo = mysql.createConnection(config.stats.database);
                let basicStatsQuery = `SELECT * FROM ATVgeneral WHERE origin = "${origin}" AND arch != "null" ORDER BY datetime DESC`;
                connectionDeviceInfo.query(basicStatsQuery, function (err, statsResults) {
                    if (err) {
                        console.log("Stats Info Query Error:", err);
                    } else {
                        getStatsDeviceInfo(origin, color, deviceInfoArray, statsResults[0], cycleStatPosition);
                    }
                }); //End of query
                connectionDeviceInfo.end();
            }
        } //End of parseDeviceInfo()

        async function getStatsDeviceInfo(origin, color, deviceInfoArray, statsDevice, cycleStatPosition) {
            try {
                for (const [key, value] of Object.entries(statsDevice)) {
                    if (config.stats.deviceInfo[key] === true) {
                        deviceInfoArray.push(`**${key}:** ${value}`);
                    }
                }
            }
            catch(err){}
            if (config.stats.deviceInfo.cycle === true && config.deviceControl.powerCycleType.toLowerCase() === "devicecontrol") {
                let connectionCycleInfo = mysql.createConnection(config.stats.database);
                let cycleQuery = `SELECT * FROM relay WHERE origin = "${origin}"`;
                connectionCycleInfo.query(cycleQuery, function (err, cycleResults) {
                    if (err || cycleResults.length == 0) {
                        console.log("Cycle Stat Query Error:", err);
                        createStatsList(origin, color, deviceInfoArray);
                    } else {
                        deviceInfoArray.splice(cycleStatPosition, 0, `**last cycle:** ${moment(cycleResults[0].lastCycle).from(moment())} (#${cycleResults[0].totCycle})`);
                        createStatsList(origin, color, deviceInfoArray);
                    }
                }); //End of query
                connectionCycleInfo.end();
            } else {
                createStatsList(origin, color, deviceInfoArray);
            }
        } //End of getStatsDeviceInfo()

        async function createStatsList(origin, color, deviceInfoArray) {
            let statsSelectListHourly = [{
                    label: `Locations Handled (hourly)`,
                    value: `${config.serverName}~deviceStats~${origin}~locationsHandled~hourly`
                },
                {
                    label: `Locations Success (hourly)`,
                    value: `${config.serverName}~deviceStats~${origin}~locationsSuccess~hourly`
                },
                {
                    label: `Locations Time (hourly)`,
                    value: `${config.serverName}~deviceStats~${origin}~locationsTime~hourly`
                },
                {
                    label: `Mons Scanned (hourly)`,
                    value: `${config.serverName}~deviceStats~${origin}~monsScanned~hourly`
                },
                {
                    label: `Proto Success Rate (hourly)`,
                    value: `${config.serverName}~deviceStats~${origin}~protoSuccess~hourly`
                },
                {
                    label: `Restarts/Reboots (hourly)`,
                    value: `${config.serverName}~deviceStats~${origin}~restartReboot~hourly`
                },
            ]
            let statsSelectListDaily = [{
                    label: `Locations Handled (daily)`,
                    value: `${config.serverName}~deviceStats~${origin}~locationsHandled~daily`
                },
                {
                    label: `Location Success (daily)`,
                    value: `${config.serverName}~deviceStats~${origin}~locationsSuccess~daily`
                },
                {
                    label: `Locations Time (daily)`,
                    value: `${config.serverName}~deviceStats~${origin}~locationsTime~daily`
                },
                {
                    label: `Mons Scanned (daily)`,
                    value: `${config.serverName}~deviceStats~${origin}~monsScanned~daily`
                },
                {
                    label: `Proto Success Rate (daily)`,
                    value: `${config.serverName}~deviceStats~${origin}~protoSuccess~daily`
                },
                {
                    label: `Restarts/Reboots (daily)`,
                    value: `${config.serverName}~deviceStats~${origin}~restartReboot~daily`
                },
                {
                    label: `Temperature`,
                    value: `${config.serverName}~deviceStats~${origin}~temperature~daily`
                },
            ];
            let statsComponentHourly = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                    .setCustomId(`${config.serverName}~deviceStats~hourly`)
                    .setPlaceholder(`${origin} Hourly Stats`)
                    .addOptions(statsSelectListHourly)
                );
            let statsComponentDaily = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                    .setCustomId(`${config.serverName}~deviceStats~daily`)
                    .setPlaceholder(`${origin} Daily Stats`)
                    .addOptions(statsSelectListDaily)
                )
            let statsListArray = [statsComponentHourly, statsComponentDaily];
            sendDeviceInfo(origin, color, deviceInfoArray, statsListArray);
        } //End of createStatsList()

        async function sendDeviceInfo(origin, color, deviceInfoArray, statsListArray) {
            var deviceComponents = [];
            if (config.deviceControl.path) {
                let controlSelectList = [{
                        label: `Pause ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~pauseDevice`
                    },
                    {
                        label: `Unpause ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~unpauseDevice`
                    },
                    {
                        label: `Start PoGo on ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~startPogo`
                    },
                    {
                        label: `Quit PoGo on ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~quitPogo`
                    },
                    {
                        label: `Reboot ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~rebootDevice`
                    },
                    {
                        label: `Logcat for ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~logcatDevice`
                    },
                    {
                        label: `Clear game data on ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~clearGame`
                    },
                    {
                        label: `Screenshot of ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~screenshot`
                    }
                ]
                if (config.deviceControl.powerCycleType.toLowerCase().replace(' ','') === 'devicecontrol') {
                    controlSelectList.push({
                        label: `Power cycle ${origin}`,
                        value: `${config.serverName}~deviceControl~${origin}~cycle`
                    })
                } else if (config.deviceControl.powerCycleType.toLowerCase().replace(' ','').replace('raspberryrelay','raspberry') === 'raspberry') {
                    controlSelectList.push({
                        label: `Power cycle ${origin}`,
                        value: `raspberryRelay~${origin}`
                    })
                }
                let controlListComponent = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                        .setCustomId(`${config.serverName}~deviceControl`)
                        .setPlaceholder(`${origin} DeviceControl`)
                        .addOptions(controlSelectList),
                    );
                deviceComponents.push(controlListComponent);
            } //End of deviceControl
            if (statsListArray !== '') {
                deviceComponents.push(statsListArray[0], statsListArray[1]);
                //deviceComponents.push(statsListArray[1]);
            }
            console.log(`${user} looked for ${origin} device info.`);
            channel.send({
                    embeds: [new MessageEmbed().setTitle(`${origin} Info:`).setDescription(`- ${deviceInfoArray.join('\n- ')}`).setColor(color).setFooter(`${user}`)],
                    components: deviceComponents
                }).catch(console.error)
                .then(msg => {
                    if (config.devices.infoMessageDeleteSeconds > 0) {
                        setTimeout(() => msg.delete().catch(err => console.log(`Error deleting ${origin} device message:`, err)), (config.devices.infoMessageDeleteSeconds * 1000));
                    }
                });
        } //End of sendDeviceInfo()
    }, //End of getDeviceInfo()
}