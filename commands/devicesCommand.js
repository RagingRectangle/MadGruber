const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Devices = require('../functions/devices.js');
const config = require('../config/config.json');
let dbInfo = require('../MAD_Database_Info.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.devicesCommand)
		.setDescription("Show status of devices")
		.addStringOption(option =>
			option
			.setName('optional-device')
			.setDescription('Name of device')),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl')) {
			interaction.deferReply();
			var deviceID = '';
			var specificCheck = false;
			try {
				if (interaction.options._hoistedOptions[0]['value']) {
					specificCheck = true;
					deviceID = interaction.options._hoistedOptions[0]['value'];
					console.log(deviceID)
				}
			} catch (err) {}
			if (specificCheck === true) {
				for (const [key, value] of Object.entries(dbInfo.devices)) {
					if (deviceID === value.name.toLowerCase()) {
						Devices.getDeviceInfo(channel, interaction.user, key);
					}
				}
			} else {
				Devices.deviceStatus(channel, interaction.user);
			}
		}
		else {
			channel.send(`User *${interaction.user.username}* does not have required device perms`).catch(console.error);
		}
		return "delete";
	},
};