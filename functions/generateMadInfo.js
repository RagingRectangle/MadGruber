const fs = require('fs');
const mysql = require('mysql');
const config = require('../config/config.json');

module.exports = {
    generate: async function generate() {
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

        async function getDeviceInfo(connection, instances) {
            let deviceQuery = `SELECT * FROM settings_device`;
            connection.query(deviceQuery, function (err, results) {
                if (err) {
                    console.log("Device Query Error:", err);
                    connection.end();
                } else {
                    var devices = {};
                    results.forEach(device => {
                        let deviceObj = {
                            name: device.name,
                            instance_id: device.instance_id,
                            login: device.ggl_login_mail,
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
                        "areas": areas
                    }
                    fs.writeFileSync('./MAD_Database_Info.json', JSON.stringify(dbInfo));
                    connection.end();
                }
            }) //End of query
        } //End of getAreaInfo()
    } //End of generate()
}