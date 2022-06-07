const {
	SlashCommandBuilder
} = require('@discordjs/builders');
const fs = require('fs');
const pm2 = require('pm2');
const Roles = require('../functions/roles.js');
const PM2 = require('../functions/pm2.js');
const config = require('../config/config.json');
const dbInfo = require('../MAD_Database_Info.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName(config.discord.pm2Command)
		.setDescription("Show PM2 controller")
		.addStringOption(option => {
			option
				.setName('restart')
				.setDescription('Restart PM2 Process')
			for (var i = 0; i < dbInfo.processList.length && i < 25; i++) {
				option.addChoices({
					name: dbInfo.processList[i],
					value: dbInfo.processList[i]
				});
			}
			return option;
		})
		.addStringOption(option => {
			option
				.setName('start')
				.setDescription('Start PM2 Process')
			for (var i = 0; i < dbInfo.processList.length && i < 25; i++) {
				option.addChoices({
					name: dbInfo.processList[i],
					value: dbInfo.processList[i]
				});
			}
			return option;
		})
		.addStringOption(option => {
			option
				.setName('stop')
				.setDescription('Stop PM2 Process')
			for (var i = 0; i < dbInfo.processList.length && i < 25; i++) {
				option.addChoices({
					name: dbInfo.processList[i],
					value: dbInfo.processList[i]
				});
			}
			return option;
		}),

	async execute(client, interaction) {
		let channel = await client.channels.fetch(interaction.channelId).catch(console.error);
		let guild = await client.guilds.fetch(interaction.guildId).catch(console.error);
		let userPerms = await Roles.getUserCommandPerms(guild, interaction.user);
		if (userPerms.includes('admin') || userPerms.includes('pm2')) {
			interaction.deferReply();
			let options = interaction.options._hoistedOptions;
			if (options.length == 0) {
				PM2.updateStatus(channel, 'new');
			} else {
				for (var i = 0; i < options.length; i++) {
					PM2.runPM2(channel, interaction.user, `${options[i]['name']}~${options[i]['value']}`);
				} //End of i loop
			}
			//PM2.updateStatus(channel, 'new');
		} //End of if userPerms
		else {
			channel.send(`User *${interaction.user.username}* does not have required PM2 perms`).catch(console.error);
		}
		return "delete";
	},
};