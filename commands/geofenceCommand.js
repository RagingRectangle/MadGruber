const {
	SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const Geofences = require('../functions/geofenceConverter.js');
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.geofenceCommand.toLowerCase().replaceAll(/[^a-z0-9]/gi, '_'))
		.setDescription("Convert MAD geofences"),

	async execute(client, interaction) {
		interaction.deferReply();
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms(guild, interaction.user);
		if (userPerms.includes('admin')) {
			Geofences.converterMain(channel, interaction.user);
		} else {
			channel.send(`User *${interaction.user.username}* does not have required admin perms to convert geofences`).catch(console.error);
		}
		return "delete";
	},
};