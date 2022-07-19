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
const fs = require('fs');
const mysql = require('mysql');
const config = require('../config/config.json');

module.exports = {
   converterMain: async function converterMain(channel, user) {
      let connection = mysql.createConnection(config.madDB);
      connection.connect();
      let fenceListQuery = `SELECT name FROM settings_geofence`;
      connection.query(fenceListQuery, async function (err, results) {
         if (err) {
            console.log(`(${user.username}) Count Query Error:`, err);
         } else {
            var fenceList = [];
            for (var r = 0; r < results.length; r++) {
               fenceList.push({
                  label: results[r]['name'],
                  value: `${results[r]['name']}~~${r}`
               });
            } //End of i loop
            var componentList = [];
            for (var i = 0, j = fenceList.length; i < j; i += 25) {
               if (componentList.length < 5) {
                  componentList.push(new ActionRowBuilder()
                     .addComponents(
                        new SelectMenuBuilder()
                        .setCustomId(`${config.serverName}~geofenceList~${componentList.length}`)
                        .setPlaceholder('Select geofence to convert')
                        .addOptions(fenceList.slice(i, i + 25))
                     )
                  );
               }
            } //End of i/j loop
            channel.send({
               content: '**Convert MAD Geofences:**',
               components: componentList
            }).catch(console.error);
         }
      }); //End of query
      connection.end();
   }, //End of converterMain()

   convert: async function convert(channel, user, fenceName) {
      let fenceQuery = `SELECT fence_data FROM settings_geofence WHERE name = "${fenceName}" LIMIT 1`;
      let connection = mysql.createConnection(config.madDB);
      connection.connect();
      connection.query(fenceQuery, function (err, results) {
         if (err) {
            console.log(`(${user.username}) Geofence Converter Error:`, err);
         } else {
            console.log(`(${user.username}) selected the ${fenceName} geofence to convert`);
            let fenceData = JSON.parse(results[0]['fence_data']);
            //Multiple Geofences
            if (fenceData[0].startsWith('[')) {
               convertToMultipleGeofences(fenceName, fenceData);
            }
            //Single Geofence
            else {
               convertToSingleGeofence(fenceName, fenceData);
            }
         }
      }); //End of convert
      connection.end();

      async function convertToSingleGeofence(fenceName, fenceData) {
         var geoCoordList = [];
         var simpleCoordList = [];
         for (var f = 0; f < fenceData.length; f++) {
            let point = fenceData[f].split(',');
            geoCoordList.push([Number(point[1]), Number(point[0])]);
            simpleCoordList.push([Number(point[0]), Number(point[1])]);
         } //End of f loop
         var geoJSON = {
            type: 'FeatureCollection',
            features: [{
               type: "Feature",
               properties: {
                  name: fenceName,
                  id: 1,
                  fill: `#${Math.floor(Math.random()*16777215).toString(16)}`
               },
               geometry: {
                  type: "Polygon",
                  coordinates: [geoCoordList]
               }
            }]
         };
         var simpleJSON = [{
            name: fenceName,
            id: 1,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            path: [simpleCoordList]
         }];
         let geoAttachment = await new MessageAttachment(Buffer.from(JSON.stringify(geoJSON)), `${fenceName}_GeoJSON.json`);
         let simpleAttachment = await new MessageAttachment(Buffer.from(JSON.stringify(simpleJSON)), `${fenceName}_SimpleJSON.json`);
         channel.send({
            content: `**Converted geofence for ${fenceName}:**`,
            files: [geoAttachment, simpleAttachment]
         }).catch(console.error);
      } //End of convertToSingleGeofence()

      async function convertToMultipleGeofences(fenceNameMain, fenceData) {
         var geoJSON = {
            type: 'FeatureCollection',
            features: []
         }
         var simpleJSON = [];
         var fenceID = 1;
         var fenceName = fenceData[0].slice(1, -1);
         var geoCoordList = [];
         var simpleCoordList = [];
         for (var i = 1; i < fenceData.length; i++) {
            //Save geofence and start new
            if (fenceData[i].startsWith('[')) {
               geoJSON.features.push({
                  type: "Feature",
                  properties: {
                     name: fenceName,
                     id: fenceID,
                     fill: `#${Math.floor(Math.random()*16777215).toString(16)}`
                  },
                  geometry: {
                     type: "Polygon",
                     coordinates: [geoCoordList]
                  }
               });
               simpleJSON.push({
                  name: fenceName,
                  id: fenceID,
                  color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                  path: [simpleCoordList]
               });
               fenceName = fenceData[i].slice(1, -1);
               geoCoordList = [];
               simpleCoordList = [];
               fenceID++;
            }
            //Add coords
            else {
               let point = fenceData[i].split(',');
               geoCoordList.push([Number(point[1]), Number(point[0])]);
               simpleCoordList.push([Number(point[0]), Number(point[1])]);
            }
         } //End of i loop
         //Save remaining geofence
         geoJSON.features.push({
            type: "Feature",
            properties: {
               name: fenceName,
               id: fenceID,
               fill: `#${Math.floor(Math.random()*16777215).toString(16)}`
            },
            geometry: {
               type: "Polygon",
               coordinates: [geoCoordList]
            }
         });
         simpleJSON.push({
            name: fenceName,
            id: fenceID,
            path: [simpleCoordList]
         });
         let geoAttachment = await new MessageAttachment(Buffer.from(JSON.stringify(geoJSON)), `${fenceNameMain}_GeoJSON.json`);
         let simpleAttachment = await new MessageAttachment(Buffer.from(JSON.stringify(simpleJSON)), `${fenceNameMain}_SimpleJSON.json`);
         channel.send({
            content: `**Converted geofence for ${fenceNameMain}:**`,
            files: [geoAttachment, simpleAttachment]
         }).catch(console.error);
      } //End of convertToMultipleGeofences
   } //End of convert()
}