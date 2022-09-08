const {
   Client,
   GatewayIntentBits,
   Partials,
   Collection,
   Permissions,
   ActionRowBuilder,
   SelectMenuBuilder,
   MessageButton,
   EmbedBuilder,
   ButtonBuilder,
   InteractionType,
   ChannelType
} = require('discord.js');
const mysql = require('mysql');
const QuickChart = require('quickchart-js');
const convert = require('color-convert');
const moment = require('moment');
const config = require('../config/config.json');

module.exports = {
   stats: async function stats(client, channel, user) {
      let systemStatsList = [{
            label: `Despawn Time Left`,
            value: `${config.serverName}~systemStats~despawn%`
         },
         {
            label: `Hundos + Nundos + Shinies`,
            value: `${config.serverName}~systemStats~hundoNundoShiny`
         },
         {
            label: `Location Handling`,
            value: `${config.serverName}~systemStats~locationHandling`
         },
         {
            label: `Mons Scanned`,
            value: `${config.serverName}~systemStats~monsScanned`
         },
         {
            label: `Restarts + Reboots`,
            value: `${config.serverName}~systemStats~restartsReboots`
         },
         {
            label: `Uptime`,
            value: `${config.serverName}~systemStats~uptime`
         }
      ];
      let componentHourly = new ActionRowBuilder()
         .addComponents(
            new SelectMenuBuilder()
            .setCustomId(`${config.serverName}~systemStats~hourly`)
            .setPlaceholder(`Hourly ${config.serverName} Stats`)
            .addOptions(systemStatsList)
         );
      let componentDaily = new ActionRowBuilder()
         .addComponents(
            new SelectMenuBuilder()
            .setCustomId(`${config.serverName}~systemStats~daily`)
            .setPlaceholder(`Daily ${config.serverName} Stats`)
            .addOptions(systemStatsList)
         );
      channel.send({
         embeds: [new EmbedBuilder().setTitle(`${config.serverName} Stats`).setDescription(`Select option below for more info:`).setFooter({
            text: `${user.username}`
         })],
         components: [componentHourly, componentDaily]
      }).catch(console.error);
   }, //End of stats()

   systemStats: async function systemStats(channel, user, statDuration, statType) {
      console.log(`${user.username} looked up system stats: ${statDuration} ${statType}`);
      let statsDB = config.stats.database;
      statsDB.multipleStatements = true;
      let connectionStats = mysql.createConnection(statsDB);
      var rpl = 60;
      var rplType = 'Hourly';
      var rplLength = config.stats.dataPointCount.hourly;
      var rplStamp = 'MM-DD HH:mm';
      if (statDuration === 'daily') {
         rpl = 1440;
         rplType = 'Daily';
         rplLength = config.stats.dataPointCount.daily;
         rplStamp = 'MM-DD';
      }
      let color1 = config.stats.colorPalette.color1.toLowerCase();
      let background1 = `rgba(${convert.keyword.rgb(color1).join(', ')}, 0.5)`;
      let color2 = config.stats.colorPalette.color2.toLowerCase();
      let background2 = `rgba(${convert.keyword.rgb(color2).join(', ')}, 0.5)`;
      let color3 = config.stats.colorPalette.color3.toLowerCase();
      let background3 = `rgba(${convert.keyword.rgb(color3).join(', ')}, 0.5)`;
      if (statType === 'uptime') {
         let rawDataQuery = `SELECT datetime "time", 100*sum(TRPL)/sum(RPL) AS "rawData" FROM stats.stats_worker WHERE RPL = '${rpl}' GROUP BY 1 ORDER BY datetime DESC LIMIT ${rplLength}`;
         let timeProtoQuery = `SELECT datetime AS "time", 100*(sum(RPL)-sum(missingProtoMinute))/sum(RPL) AS "timeProto" FROM stats_worker WHERE RPL = '${rpl}' GROUP BY 1 ORDER BY datetime DESC LIMIT ${rplLength}`;
         connectionStats.query(`${rawDataQuery}; ${timeProtoQuery}`, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting uptime stats:`, err);
            } else {
               let rawDataResults = resultsTemp[0].reverse();
               let timeProtoResults = resultsTemp[1].reverse();
               var labels = [];
               var rawData = [];
               var timeProto = [];
               rawDataResults.forEach(entry => {
                  labels.push(moment(entry.time).format(rplStamp));
                  rawData.push(entry.rawData);
               });
               timeProtoResults.forEach(entry => {
                  timeProto.push(entry.timeProto);
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                           label: `Raw Data`,
                           data: rawData,
                           fill: true,
                           borderColor: color1,
                           backgroundColor: background1,
                           pointRadius: 0,
                        },
                        {
                           label: `Time Proto`,
                           data: timeProto,
                           fill: true,
                           borderColor: color2,
                           backgroundColor: background2,
                           pointRadius: 0,
                        }
                     ]
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 95,
                              suggestedMax: 100,
                              callback: (val) => {
                                 return val + ' %'
                              }
                           }
                        }],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`Uptime (${rplType})`, url);
            }
         });

      } //End of uptime
      else if (statType === 'restartsReboots') {
         let restartRebootQuery = `SELECT datetime AS "time", sum(Res)/count(Worker) AS "restarts", sum(Reb)/count(Worker) AS "reboots" FROM stats_worker WHERE RPL = '${rpl}' GROUP BY 1 ORDER BY datetime DESC LIMIT ${rplLength}`;
         connectionStats.query(restartRebootQuery, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting restart/reboot stats:`, err);
            } else {
               let results = resultsTemp.reverse();
               var labels = [];
               var restarts = [];
               var reboots = [];
               results.forEach(entry => {
                  labels.push(moment(entry.time).format(rplStamp));
                  restarts.push(entry.restarts);
                  reboots.push(entry.reboots);
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                           label: `Restarts`,
                           data: restarts,
                           fill: true,
                           borderColor: color1,
                           backgroundColor: background1,
                           pointRadius: 0,
                        },
                        {
                           label: `Reboots`,
                           data: reboots,
                           fill: true,
                           borderColor: color2,
                           backgroundColor: background2,
                           pointRadius: 0,
                        }
                     ]
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 0,
                              suggestedMax: 1,
                           }
                        }],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`Restarts/Reboots Per Device (${rplType})`, url);
            }
         });
      } //End of restartsReboots
      else if (statType === 'monsScanned') {
         let monsQuery = `SELECT a.datetime "time", sum(Mons_all) AS "mons", 100*sum(a.MonsIV)/sum(a.Mons_all) AS "iv" FROM stats_area a WHERE a.RPL = '${rpl}' and a.Fence <> 'Unfenced' GROUP BY 1 ORDER BY datetime DESC LIMIT ${rplLength}`;
         connectionStats.query(monsQuery, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting monsScanned stats:`, err);
            } else {
               let results = resultsTemp.reverse();
               var labels = [];
               var mons = [];
               var iv = [];
               results.forEach(entry => {
                  labels.push(moment(entry.time).format(rplStamp));
                  mons.push(entry.mons);
                  iv.push(entry.iv);
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                           label: `Mons`,
                           data: mons,
                           fill: true,
                           borderColor: color1,
                           backgroundColor: background1,
                           pointRadius: 0,
                           yAxisID: 'left_mons'
                        },
                        {
                           label: `IV`,
                           data: iv,
                           fill: true,
                           borderColor: color2,
                           backgroundColor: background2,
                           pointRadius: 0,
                           yAxisID: 'right_iv'
                        }
                     ]
                  },
                  options: {
                     "stacked": false,
                     scales: {
                        yAxes: [{
                              id: "left_mons",
                              type: "linear",
                              display: true,
                              position: "left",
                              ticks: {
                                 suggestedMin: 0,
                                 suggestedMax: 1,
                                 fontColor: color1,
                                 callback: (val) => {
                                    return val.toLocaleString();
                                 }
                              }
                           },
                           {
                              id: "right_iv",
                              type: "linear",
                              display: true,
                              position: "right",
                              ticks: {
                                 suggestedMin: 0,
                                 suggestedMax: 100,
                                 fontColor: color2,
                                 callback: (val) => {
                                    return val + ' %'
                                 }
                              }
                           }
                        ],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`Mons Scanned (${rplType})`, url);
            }
         });
      } //End of monsScanned
      else if (statType === 'locationHandling') {
         let handlingQuery = `SELECT datetime "time", 100*sum(LocOk)/sum(Tloc) AS "total", 100*sum(TpOk)/sum(Tp) AS "teleport", 100*sum(WkOk)/sum(Wk) AS "walk" FROM stats_worker WHERE RPL = '${rpl}' GROUP BY 1 ORDER BY datetime DESC limit ${rplLength}`;
         connectionStats.query(handlingQuery, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting handling stats:`, err);
            } else {
               let results = resultsTemp.reverse();
               var labels = [];
               var teleport = [];
               var nullTeleport = true;
               var walk = [];
               var nullWalk = true;
               results.forEach(entry => {
                  labels.push(moment(entry.time).format(rplStamp));
                  teleport.push(entry.teleport);
                  walk.push(entry.walk);
                  if (entry.teleport !== null) {
                     nullTeleport = false;
                  }
                  if (entry.walk !== null) {
                     nullWalk = false;
                  }
               });
               var datasets = [];
               let teleportData = {
                  label: `Teleport`,
                  data: teleport,
                  fill: true,
                  borderColor: color1,
                  backgroundColor: background1,
                  pointRadius: 0,
               }
               let walkData = {
                  label: `Walk`,
                  data: walk,
                  fill: true,
                  borderColor: color2,
                  backgroundColor: background2,
                  pointRadius: 0,
               }
               //Has only teleport
               if (nullTeleport === false && nullWalk === true) {
                  teleportData.borderColor = QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]);
                  teleportData.fill = false;
                  datasets.push(teleportData);
               }
               //Has only walk
               else if (nullTeleport === true && nullWalk === false) {
                  walkData.borderColor = QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]);
                  walkData.fill = false;
                  datasets.push(walkData);
               }
               //Has both teleport and walk data
               else {
                  datasets.push(teleportData);
                  datasets.push(walkData);
               }
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: datasets
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 97,
                              suggestedMax: 100,
                              callback: (val) => {
                                 return val + ' %'
                              }
                           }
                        }],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`Location Handling (${rplType})`, url);
            }
         })
      } //End of locationHandling
      else if (statType === 'hundoNundoShiny') {
         let hundoQuery = `SELECT datetime 'time', sum(a.iv100) as 'hundo' FROM stats_area a WHERE a.RPL = ${rpl} GROUP BY a.datetime DESC limit ${rplLength}`;
         let nundoQuery = `SELECT datetime 'time', sum(a.iv0) as 'nundo' FROM stats_area a WHERE a.RPL = ${rpl} GROUP BY a.datetime DESC limit ${rplLength}`;
         let shinyQuery = `SELECT a.datetime 'time', sum(b.shiny) as 'count', 100*sum(b.shiny)/sum(a.Mons_all) as 'percent' FROM stats_area a, stats_worker b, Area c WHERE a.RPL = '${rpl}' and a.datetime = b.datetime and a.RPL = b.RPL and c.area = a.area and c.origin = b.worker GROUP BY a.datetime DESC LIMIT ${rplLength}`;
         connectionStats.query(`${hundoQuery}; ${nundoQuery}; ${shinyQuery}`, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting hundo/nundo/shiny stats:`, err);
            } else {
               let hundoResults = resultsTemp[0].reverse();
               let nundoResults = resultsTemp[1].reverse();
               var shinyResults = resultsTemp[2].reverse();
               var labels = [];
               var hundos = [];
               var nundos = [];
               var shinies = [];
               hundoResults.forEach(entry => {
                  labels.push(moment(entry.time).format(rplStamp));
                  hundos.push(entry.hundo);
               });
               nundoResults.forEach(entry => {
                  nundos.push(entry.nundo);
               });
               shinyResults.forEach(entry => {
                  shinies.push(entry.count);
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                           label: `Hundos`,
                           data: hundos,
                           fill: true,
                           borderColor: color1,
                           backgroundColor: background1,
                           pointRadius: 0,
                           yAxisID: 'left'
                        },
                        {
                           label: `Nundos`,
                           data: nundos,
                           fill: true,
                           borderColor: color2,
                           backgroundColor: background2,
                           pointRadius: 0,
                           yAxisID: 'left'
                        },
                        {
                           label: `Shinies`,
                           data: shinies,
                           fill: true,
                           borderColor: color3,
                           backgroundColor: background3,
                           pointRadius: 0,
                           yAxisID: 'right'
                        }
                     ]
                  },
                  options: {
                     "stacked": false,
                     scales: {
                        yAxes: [{
                              id: "left",
                              type: "linear",
                              display: true,
                              position: "left",
                              ticks: {
                                 suggestedMin: 0,
                                 suggestedMax: 1,
                                 fontColor: 'black',
                                 callback: (val) => {
                                    return val.toLocaleString();
                                 }
                              }
                           },
                           {
                              id: "right",
                              type: "linear",
                              display: true,
                              position: "right",
                              ticks: {
                                 suggestedMin: 0,
                                 suggestedMax: 1,
                                 fontColor: color3,
                                 callback: (val) => {
                                    return val.toLocaleString();
                                 }
                              }
                           }
                        ],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`Hundos / Nundos / Shinies (${rplType})`, url);
            }
         })
      } //End of hundoNundoShiny
      else if (statType === 'despawn%') {
         let despawnQuery = `SELECT a.datetime "time", 100*sum(a.MinutesLeft)/((sum(a.Spawndef15) * 60)+(sum(a.SpawndefNot15) * 30)) AS "despawnTime" FROM stats_area a WHERE a.RPL = '${rpl}' and a.Fence <> 'Unfenced' GROUP BY 1 ORDER BY a.datetime DESC limit ${rplLength}`;
         connectionStats.query(despawnQuery, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting despawn%:`, err);
            } else {
               let results = resultsTemp.reverse();
               var labels = [];
               var despawnTime = [];
               results.forEach(entry => {
                  labels.push(moment(entry.time).format(rplStamp));
                  despawnTime.push(entry.despawnTime);
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                        label: `% Left`,
                        data: despawnTime,
                        fill: false,
                        borderColor: QuickChart.getGradientFillHelper('vertical', ["#00A650", "#FDB813", "#FF000B"]),
                        pointRadius: 0,
                     }]
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 50,
                              suggestedMax: 50,
                              callback: (val) => {
                                 return val + ' %'
                              }
                           }
                        }],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`Despawn Time Left (${rplType})`, url);
            }
         });
      } //End of despawn%
      connectionStats.end();
      async function sendChart(title, url) {
         channel.send({
               embeds: [new EmbedBuilder().setTitle(title).setImage(url).setFooter({
                  text: `${user.username}`
               })],
            }).catch(console.error)
            .then(async msg => {
               if (config.stats.graphDeleteSeconds > 0) {
                  setTimeout(() => msg.delete().catch(err => console.log(`(${user.username}) Error deleting screenshot:`, err)), (config.stats.graphDeleteSeconds * 1000));
               }
            })
      } //End of sendChart()
   }, //End of systemStats()

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
      let color1 = config.stats.colorPalette.color1.toLowerCase();
      let background1 = `rgba(${convert.keyword.rgb(color1).join(', ')}, 0.5)`;
      let color2 = config.stats.colorPalette.color2.toLowerCase();
      let background2 = `rgba(${convert.keyword.rgb(color2).join(', ')}, 0.5)`;
      let color3 = config.stats.colorPalette.color3.toLowerCase();
      let background3 = `rgba(${convert.keyword.rgb(color3).join(', ')}, 0.5)`;
      console.log(`${interaction.user.username} ran stats for ${rplType.toLowerCase()} ${statType} on ${origin}`);
      let statQuery = `SELECT * FROM stats_worker WHERE Worker = "${origin}" AND RPL = ${rpl} ORDER BY Datetime DESC LIMIT ${rplLength}`;
      let connection = mysql.createConnection(config.stats.database);
      connection.connect();
      //Temperature
      if (statType === 'temperature') {
         let statTemperatureQuery = `SELECT * FROM ATVgeneral WHERE origin = "${origin}" ORDER BY datetime LIMIT ${rplLength}`;
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
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                           label: `Total`,
                           data: monsScanned,
                           fill: false,
                           borderColor: color1,
                           pointRadius: 0,
                        },
                        {
                           label: `IV`,
                           data: ivScanned,
                           fill: false,
                           borderColor: color2,
                           pointRadius: 0,
                        }
                     ]
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 0,
                              suggestedMax: 100,
                              callback: (val) => {
                                 return val.toLocaleString();
                              }
                           }
                        }],
                     }
                  }
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
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                           label: `Restarts`,
                           data: restarts,
                           fill: true,
                           borderColor: color1,
                           backgroundColor: background1,
                           pointRadius: 0,
                        },
                        {
                           label: `Reboots`,
                           data: reboots,
                           fill: true,
                           borderColor: color2,
                           backgroundColor: background2,
                           pointRadius: 0,
                        }
                     ]
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 0,
                              suggestedMax: 1,
                              callback: (val) => {
                                 return val.toLocaleString();
                              }
                           }
                        }],
                     }
                  }
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
               });
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
                              callback: (val) => {
                                 return val + ' %'
                              }
                           }
                        }],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               interaction.message.channel.send({
                  embeds: [new EmbedBuilder().setTitle(`${origin} Proto Success Rate (${rplType})`).setImage(url).setFooter({
                     text: `${interaction.user.username}`
                  })],
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
               });
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
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 97,
                              suggestedMax: 100,
                              callback: (val) => {
                                 return val.toLocaleString();
                              }
                           }
                        }],
                     }
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
               });
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
                              callback: (val) => {
                                 return val + ' %'
                              }
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
      else if (statType === 'locationsTime') {
         connection.query(statQuery, async function (err, resultsTemp) {
            if (err) {
               console.log(`Error getting location time stats:`, err);
            } else {
               let results = resultsTemp.reverse();
               var labels = [];
               var locationTime = [];
               results.forEach(entry => {
                  labels.push(moment(entry.Datetime).format(rplStamp));
                  locationTime.push(entry.TpSt / entry.TpOk);
               });
               let myChart = new QuickChart();
               myChart.setConfig({
                  type: 'line',
                  data: {
                     labels: labels,
                     datasets: [{
                        label: `Time`,
                        data: locationTime,
                        fill: false,
                        borderColor: QuickChart.getGradientFillHelper('vertical', ["#FF000B", "#FDB813", "#00A650"]),
                        pointRadius: 0,
                     }]
                  },
                  options: {
                     scales: {
                        yAxes: [{
                           ticks: {
                              suggestedMin: 0,
                              suggestedMax: 4,
                           }
                        }],
                     }
                  }
               });
               const url = await myChart.getShortUrl();
               sendChart(`${origin} Location Time (${rplType})`, url);
            }
         })
      } //End of locationsTime
      connection.end();

      async function sendChart(title, url) {
         interaction.message.channel.send({
               embeds: [new EmbedBuilder().setTitle(title).setImage(url).setFooter({
                  text: `${interaction.user.username}`
               })],
            }).catch(console.error)
            .then(async msg => {
               if (config.stats.graphDeleteSeconds > 0) {
                  setTimeout(() => msg.delete().catch(err => console.log(`(${interaction.user.username}) Error deleting screenshot:`, err)), (config.stats.graphDeleteSeconds * 1000));
               }
            })
      } //End of sendChart()
   } //End of deviceStats()
}