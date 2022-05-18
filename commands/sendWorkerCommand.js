const {
	MessageEmbed,
} = require('discord.js');
const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const Roles = require('../functions/roles.js');
const DeviceControl = require('../functions/deviceControl.js');
const config = require('../config/config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.sendWorkerCommand)
		.setDescription(`Send worker to location`)
		.addStringOption(option =>
			option.setName('coordinates')
			.setDescription('Set worker location')
			.setRequired(true)),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms('GUILD_TEXT', guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl')) {
			interaction.deferReply();
			if (config.stats.database.host && config.deviceControl.path && config.discord.sendWorkerCommand) {
				let coords = `${interaction.options._hoistedOptions[0]['value']},${interaction.options._hoistedOptions[1]['value']}`;
				DeviceControl.sendWorker(client, channel, interaction.user, coords);
			} else {
				channel.send(`DeviceControl information missing from config.`);
			}
		} //End of if userPerms
		else {
			channel.send(`User *${interaction.user.username}* does not have required sendWorker perms`).catch(console.error);
		}
		return "delete";
	}, //End of execute()
};