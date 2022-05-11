const {
	Client,
	Intents,
	MessageEmbed,
	Permissions,
	MessageActionRow,
	MessageSelectMenu,
	MessageButton
} = require('discord.js');
const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.DIRECT_MESSAGES],
	partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});
const fs = require('fs');
const pm2 = require('pm2');
const CronJob = require('./node_modules/cron/lib/cron.js').CronJob;
const GenerateMadInfo = require('./functions/generateMadInfo.js');
const Scripts = require('./functions/scripts.js');
const Queries = require('./functions/queries.js');
const Interactions = require('./functions/interactions.js');
const Pm2Buttons = require('./functions/pm2.js');
const Truncate = require('./functions/truncate.js');
const Links = require('./functions/links.js');
const Devices = require('./functions/devices.js');
const DeviceControl = require('./functions/deviceControl.js');
const Roles = require('./functions/roles.js');
const Stats = require('./functions/stats.js');
const Help = require('./functions/help.js');
const config = require('./config/config.json');
const roleConfig = require('./config/roles.json');
var roleMessages = [];
roleConfig.forEach(role => {
	if (role.messageID) {
		roleMessages.push(role.messageID);
	}
})


client.on('ready', () => {
	console.log("MadGruber Bot Logged In");
	//Generate database info
	if (config.madDB.host) {
		GenerateMadInfo.generate();
	}
	//No Proto Checker
	if (config.madDB.host && config.devices.noProtoCheckMinutes > 0) {
		var CronJob = require('cron').CronJob;
		var job = new CronJob(`*/${config.devices.noProtoCheckMinutes} * * * *`, function () {
			Devices.noProtoDevices(client, '', 'cron');
		}, null, true, null);
		job.start();
	}
});


client.on('messageCreate', async (receivedMessage) => {
	let message = receivedMessage.content.toLowerCase();
	var user = receivedMessage.author;
	//Ignore messages that don't start with prefix
	if (!message.startsWith(config.discord.prefix)) {
		return;
	}
	//Ignore bot messages
	if (user.bot === true) {
		return;
	}
	//DM and not admin
	if (receivedMessage.channel.type === "DM" && !config.discord.adminIDs.includes(user.id)) {
		return;
	}
	//Not in channel list
	if (receivedMessage.channel.type === "GUILD_TEXT" && !config.discord.channelIDs.includes(receivedMessage.channel.id)) {
		return;
	}
	let userPerms = await Roles.getUserCommandPerms(receivedMessage.channel.type, receivedMessage.guild, user);
	if (userPerms === []) {
		return;
	}
	//Send PM2 list/buttons
	if (config.discord.pm2Command && message === `${config.discord.prefix}${config.discord.pm2Command}`) {
		await new Promise(done => setTimeout(done, 1000 * config.delaySeconds));
		if (userPerms.includes('admin') || userPerms.includes('pm2')) {
			Pm2Buttons.updateStatus(receivedMessage.channel, 'new');
		}
	}
	//Truncate Quests
	else if (config.madDB.host && config.discord.truncateCommand && message === `${config.discord.prefix}${config.discord.truncateCommand}`) {
		await new Promise(done => setTimeout(done, 1000 * config.delaySeconds));
		if (userPerms.includes('admin') || userPerms.includes('truncate')) {
			Truncate.sendTruncateMessage(receivedMessage);
		}
	}
	//Run Scripts
	else if (config.discord.scriptCommand && message === `${config.discord.prefix}${config.discord.scriptCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('scripts')) {
			Scripts.sendScriptList(receivedMessage, 'new');
		}
	}
	//Run Queries
	else if (config.madDB.host && config.discord.madQueryCommand && message === `${config.discord.prefix}${config.discord.madQueryCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('queries')) {
			Queries.queries(receivedMessage);
		}
	}
	//Send Links
	else if (config.discord.linksCommand && message === `${config.discord.prefix}${config.discord.linksCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('links')) {
			Links.links(receivedMessage);
		}
	}
	//Device Info All
	else if (config.madDB.host && config.discord.devicesCommand && message === `${config.discord.prefix}${config.discord.devicesCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
			Devices.deviceStatus(receivedMessage);
		}
	}
	//No Proto Devices
	else if (config.madDB.host && config.discord.noProtoCommand && message === `${config.discord.prefix}${config.discord.noProtoCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
			Devices.noProtoDevices(client, receivedMessage, 'search');
		}
	}
	//Send Worker
	else if (config.stats.database.host && config.deviceControl.path && config.discord.sendWorkerCommand && message.startsWith(`${config.discord.prefix}${config.discord.sendWorkerCommand} `)) {
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl')) {
			DeviceControl.sendWorker(client, receivedMessage);
		}
	}
	//Stats
	else if (config.stats.database.host && config.discord.systemStatsCommand && message === `${config.discord.prefix}${config.discord.systemStatsCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('systemStats')) {
			Stats.stats(client, receivedMessage);
		}
	}
	//Help Menu
	else if (config.discord.helpCommand && receivedMessage.channel.type !== "DM" && message === `${config.discord.prefix}${config.discord.helpCommand}`) {
		Help.helpMenu(client, receivedMessage);
	} else {
		//Specific Device Info
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
			let dbInfo = require('./MAD_Database_Info.json');
			for (const [key, value] of Object.entries(dbInfo.devices)) {
				if (receivedMessage.content.toLowerCase() === `${config.discord.prefix}${value.name.toLowerCase()}`) {
					Devices.getDeviceInfo("search", receivedMessage, key);
				}
			}
		}
	}
}); //End of client.on(message)


client.on('interactionCreate', async interaction => {
	let user = interaction.member;
	var channelType = "GUILD_TEXT";
	if (interaction.message.guildId === null) {
		channelType = "DM";
	}
	if (user.bot == true) {
		return;
	}
	//Verify interaction
	if (!interaction.customId.startsWith(config.serverName)) {
		return;
	}
	var interactionID = interaction.customId.replace(`${config.serverName}~`, '');
	let userPerms = await Roles.getUserCommandPerms(channelType, interaction.message.guild, user);
	//Button interaction
	if (interaction.isButton()) {
		Interactions.buttonInteraction(interaction, interactionID, userPerms);
	}
	//List interaction
	else if (interaction.componentType === 'SELECT_MENU') {
		Interactions.listInteraction(interaction, interactionID, userPerms);
	}
}); //End of client.on(interactionCreate)


client.on('messageReactionAdd', async (reaction, user) => {
	if (user.bot == true) {
		return;
	}
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Error fetching the message:', error);
			return;
		}
	}
	if (roleMessages.includes(reaction.message.id)) {
		Roles.roles(reaction, user, "add");
	}
}); //End of messageReactionAdd


client.on('messageReactionRemove', async (reaction, user) => {
	if (user.bot == true) {
		return;
	}
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Error fetching the message:', error);
			return;
		}
	}
	if (roleMessages.includes(reaction.message.id)) {
		Roles.roles(reaction, user, "remove");
	}
}); //End of messageReactionRemove

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.login(config.discord.token);
