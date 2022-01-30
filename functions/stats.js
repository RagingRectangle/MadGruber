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
const shell = require('shelljs');
const QuickChart = require('quickchart-js');
const moment = require('moment');
const config = require('../config/config.json');

module.exports = {
    deviceStats: async function deviceStats(interaction, origin, statVars) {
        interaction.message.edit({
            embeds: interaction.embeds,
            components: interaction.components
        }).catch(console.error);
        statVars = statVars.split('~');
        let statType = statVars[0];
        var rpl = 60;
        var rplType = 'Hourly';
        var rplLength = config.stats.dataPointCount.hourly;
        var rplStamp = 'MM-DD HH:mm';
        if (statVars[1] === 'daily') {
            rpl = 1440;
            rplType = 'Daily';
            rplLength = config.stats.dataPointCount.daily;
            rplStamp = 'MM-DD';
        }
        console.log(`${interaction.user.username} ran stats for ${rplType.toLowerCase()} ${statType} on ${origin}`);
        let statQuery = `SELECT * FROM stats_worker WHERE Worker = "${origin}" AND RPL = ${rpl} ORDER BY Datetime DESC LIMIT ${rplLength}`;
        let connection = mysql.createConnection(config.stats.database);
        connection.connect();
        //Temperature
        if (statType === 'temperature') {
            let statTemperatureQuery = `SELECT * FROM ATVgeneral WHERE origin = "${origin}" AND temperature != "null" ORDER BY datetime LIMIT ${rplLength}`;
            connection.query(statTemperatureQuery, async function (err, results) {
                if (err) {
                    console.log(`Error getting temperature stats:`, err);
                } else {
                    var labels = [];
                    var temps = [];
                    results.forEach(atv => {
                        labels.push(moment(atv.datetime).format('MM-DD'));
                        temps.push(atv.temperature);
                    }); //End of forEach(atv)
                    let myChart = new QuickChart();
                    myChart.setConfig({
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: '°C',
                                data: temps,
                                backgroundColor: QuickChart.getGradientFillHelper('vertical', ["#FF000B", "#FDB813", "#00A650"]),
                                borderColor: "black",
                            }]
                        },
                    });
                    const url = await myChart.getShortUrl();
                    sendChart(`${origin} Temperature`, url);
                }
            });
        } //End of temperature
        else if (statType === 'monsScanned') {
            connection.query(statQuery, async function (err, resultsTemp) {
                if (err) {
                    console.log(`Error getting monsScanned stats:`, err);
                } else {
                    let results = resultsTemp.reverse();
                    var labels = [];
                    var monsScanned = [];
                    var ivScanned = [];
                    results.forEach(entry => {
                        labels.push(moment(entry.Datetime).format(rplStamp));
                        monsScanned.push(entry.Tmon);
                        ivScanned.push(entry.IVmon)
                    }); //End of forEach(entry)
                    let myChart = new QuickChart();
                    myChart.setConfig({
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                    label: `Total`,
                                    data: monsScanned,
                                    fill: false,
                                    borderColor: QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]),
                                    pointRadius: 0,
                                },
                                {
                                    label: `IV`,
                                    data: ivScanned,
                                    fill: false,
                                    pointRadius: 0,
                                }
                            ]
                        },
                    });
                    const url = await myChart.getShortUrl();
                    sendChart(`${origin} Mons Scanned (${rplType})`, url);
                }
            });
        } //End of monsScanned
        else if (statType === 'restartReboot') {
            connection.query(statQuery, async function (err, resultsTemp) {
                if (err) {
                    console.log(`Error getting restart/reboot stats:`, err);
                } else {
                    let results = resultsTemp.reverse();
                    var labels = [];
                    var restarts = [];
                    var reboots = [];
                    results.forEach(entry => {
                        labels.push(moment(entry.Datetime).format(rplStamp));
                        restarts.push(entry.Res);
                        reboots.push(entry.Reb);
                    }); //End of forEach(entry)
                    let myChart = new QuickChart();
                    myChart.setConfig({
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                    label: `Restarts`,
                                    data: restarts,
                                    fill: true,
                                    borderColor: 'blue',
                                    backgroundColor: 'rgba(0, 0, 255, .5)',
                                    pointRadius: 0,
                                },
                                {
                                    label: `Reboots`,
                                    data: reboots,
                                    fill: true,
                                    borderColor: 'red',
                                    backgroundColor: 'rgba(255, 0, 0, .5)',
                                    pointRadius: 0,
                                }
                            ]
                        },
                    });
                    const url = await myChart.getShortUrl();
                    sendChart(`${origin} Restarts/Reboots (${rplType})`, url);
                }
            })
        } //End of restartReboot
        else if (statType === 'protoSuccess') {
            connection.query(statQuery, async function (err, resultsTemp) {
                if (err) {
                    console.log(`Error getting missing proto stats:`, err);
                } else {
                    let results = resultsTemp.reverse();
                    var labels = [];
                    var missingMinutes = [];
                    var successRate = [];
                    results.forEach(entry => {
                        labels.push(moment(entry.Datetime).format(rplStamp));
                        missingMinutes.push(entry.missingProtoMinute);
                        successRate.push((1 - entry.missingProtoMinute / rpl) * 100);
                    }); //End of forEach(entry)
                    let myChart = new QuickChart();
                    myChart.setConfig({
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: `% Success`,
                                data: successRate,
                                fill: false,
                                borderColor: QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]),
                                pointRadius: 0,
                            }]
                        },
                        options: {
                            scales: {
                                yAxes: [{
                                    ticks: {
                                        suggestedMin: 97,
                                        suggestedMax: 100,
                                    }
                                }],
                            }
                        }
                    });
                    const url = await myChart.getShortUrl();
                    interaction.message.channel.send({
                        embeds: [new MessageEmbed().setTitle(`${origin} Proto Success Rate (${rplType})`).setImage(url).setFooter(`${interaction.user.username}`)],
                    }).catch(console.error);
                }
            })
        } //End of protoSuccess
        else if (statType === 'locationsHandled') {
            connection.query(statQuery, async function (err, resultsTemp) {
                if (err) {
                    console.log(`Error getting locations handled stats:`, err);
                } else {
                    let results = resultsTemp.reverse();
                    var labels = [];
                    var locationsTotal = [];
                    var locationsBad = [];
                    results.forEach(entry => {
                        labels.push(moment(entry.Datetime).format(rplStamp));
                        locationsTotal.push(entry.Tloc);
                        locationsBad.push(entry.LocNok);
                    }); //End of forEach(entry)
                    let myChart = new QuickChart();
                    myChart.setConfig({
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                    label: `Total`,
                                    data: locationsTotal,
                                    fill: false,
                                    borderColor: QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]),
                                    pointRadius: 0,
                                },
                                {
                                    label: `Bad`,
                                    data: locationsBad,
                                    fill: false,
                                    pointRadius: 0,
                                }
                            ]
                        }
                    });
                    const url = await myChart.getShortUrl();
                    sendChart(`${origin} Locations Handled (${rplType})`, url);
                }
            })
        } //End of locationsHandled
        else if (statType === 'locationsSuccess') {
            connection.query(statQuery, async function (err, resultsTemp) {
                if (err) {
                    console.log(`Error getting location success stats:`, err);
                } else {
                    let results = resultsTemp.reverse();
                    var labels = [];
                    var locationSuccess = [];
                    results.forEach(entry => {
                        labels.push(moment(entry.Datetime).format(rplStamp));
                        locationSuccess.push((entry.LocOk / entry.Tloc) * 100);
                    }); //End of forEach(entry)
                    let myChart = new QuickChart();
                    myChart.setConfig({
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: `% Success`,
                                data: locationSuccess,
                                fill: false,
                                borderColor: QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]),
                                pointRadius: 0,
                            }]
                        },
                        options: {
                            scales: {
                                yAxes: [{
                                    ticks: {
                                        suggestedMin: 97,
                                        suggestedMax: 100,
                                    }
                                }],
                            }
                        }
                    });
                    const url = await myChart.getShortUrl();
                    sendChart(`${origin} Location Success Rate (${rplType})`, url);
                }
            })
        } //End of locationsSuccess
        connection.end();

        async function sendChart(title, url) {
            interaction.message.channel.send({
                embeds: [new MessageEmbed().setTitle(title).setImage(url).setFooter(`${interaction.user.username}`)],
            }).catch(console.error)
            .then(async msg => {
                if (config.stats.graphDeleteSeconds > 0) {
                    setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting screenshot:`, err)), (config.stats.graphDeleteSeconds * 1000));
                }
            })
        } //End of sendChart()
    } //End of deviceStats()
}