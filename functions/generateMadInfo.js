const fs = require('fs');
const pm2 = require('pm2');
const mysql = require('mysql');
const config = require('../config/config.json');

module.exports = {
   generate: async function generate() {
      if (!config.madDB.host) {
         pm2Process({});
      } else {
         let connection = mysql.createConnection(config.madDB);
         //Get instance info
         let instanceQuery = `SELECT * FROM madmin_instance`;
         connection.query(instanceQuery, function (err, results) {
            if (err) {
               console.log("Instance Query Error:", err);
               connection.end();
            } else {
               var instances = {};
               results.forEach(row => {
                  instances[row.instance_id] = row.name;
               });
               getDeviceInfo(connection, instances);
            }
         }) //End of query
      }

      async function getDeviceInfo(connection, instances) {
         let deviceQuery = `SELECT * FROM settings_device`;
         connection.query(deviceQuery, function (err, results) {
            if (err) {
               console.log("Walker Query Error:", err);
               connection.end();
            } else {
               var devices = {};
               results.forEach(device => {
                  let deviceObj = {
                     name: device.name,
                     instance_id: device.instance_id,
                     loginType: device.logintype,
                     loginAccount: device.ggl_login_mail,
                     mac: device.mac_address
                  }
                  devices[device.device_id] = deviceObj;
               });
               getAreaInfo(connection, instances, devices);
            }
         }) //End of query
      } //End of getDeviceInfo()

      async function getAreaInfo(connection, instances, devices) {
         let areaQuery = `SELECT * FROM settings_area`;
         connection.query(areaQuery, function (err, results) {
            if (err) {
               console.log("Area Query Error:", err);
               connection.end();
            } else {
               var areas = {};
               results.forEach(area => {
                  let areaObj = {
                     name: area.name,
                     instance_id: area.instance_id,
                     mode: area.mode
                  }
                  areas[area.area_id] = areaObj;
               });
               var dbInfo = {
                  "instances": instances,
                  "devices": devices,
                  "areas": areas,
               }
               pm2Process(dbInfo);
               connection.end();
            }
         }) //End of query
      } //End of getAreaInfo()

      async function pm2Process(dbInfo) {
         var processList = [];
         try {
            pm2.connect(async function (err) {
               if (err) {
                  console.error(err)
               } else {
                  pm2.list((err, response) => {
                     if (err) {
                        console.error(err);
                     } else {
                        response.forEach(process => {
                           if (!config.pm2.ignore.includes(process['name'])) {
                              processList.push(process['name'])
                           }
                        }) //End of forEach process
                     }
                  }) //End of pm2.list
               }
            }) //End of pm2.connect
         } catch (err) {}
         await new Promise(done => setTimeout(done, 5000));
         processList.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
         });
         dbInfo.processList = processList;
         fs.writeFileSync('./MAD_Database_Info.json', JSON.stringify(dbInfo));
         pm2.disconnect();
      } //End of pm2Process
   } //End of generate()
}