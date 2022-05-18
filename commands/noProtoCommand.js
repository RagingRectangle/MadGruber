const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Devices = require('../functions/devices.js');
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.noProtoCommand)
		.setDescription("Show noProto devices"),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
			interaction.deferReply();
			Devices.noProtoDevices(client, channel, interaction.user, 'search');
		} //End of if userPerms
		else {
			channel.send(`User *${interaction.user.username}* does not have required noProto perms`).catch(console.error);
		}
		return "delete";
	},
};