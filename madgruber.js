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
	ButtonStyle,
	InteractionType,
	ChannelType,
} = require('discord.js');
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.DirectMessages],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
//Generate database info
if (config.madDB.host) {
	GenerateMadInfo.generate();
}
const fs = require('fs');
const pm2 = require('pm2');
const CronJob = require('cron').CronJob;
const GenerateMadInfo = require('./functions/generateMadInfo.js');
const SlashRegistry = require('./functions/slashRegistry.js');
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
const Events = require('./functions/events.js');
const Geofences = require('./functions/geofenceConverter.js');
const Help = require('./functions/help.js');
const config = require('./config/config.json');
const roleConfig = require('./config/roles.json');
var roleMessages = [];
roleConfig.forEach(role => {
	if (role.messageID) {
		roleMessages.push(role.messageID);
	}
});


client.on('ready', async () => {
	console.log("MadGruber Bot Logged In");
	//No Proto Checker
	if (config.madDB.host && config.devices.noProtoCheckMinutes > 0) {
		let noProtoJob = new CronJob(`*/${config.devices.noProtoCheckMinutes} * * * *`, function () {
			Devices.noProtoDevices(client, '', '', 'cron');
		}, null, true, null);
		noProtoJob.start();
	}
	//Automated Quest Reroll
	if (config.madDB.host && config.truncate.eventAutomation === true && config.truncate.eventGuildID && config.truncate.eventAutomation === true) {
		if (config.truncate.truncateQuestsByArea === true) {
			console.log("Warning: eventAutomation disabled because truncateQuestsByArea = true.");
		} else {
			let questJob = new CronJob(`14-59/15 * * * *`, function () {
				Events.checkEvents(client);
			}, null, true, null);
			questJob.start();
		}
	}
	//Register Slash Commands
	if (config.discord.useSlashCommands === true && config.discord.slashGuildIDs.length > 0) {
		SlashRegistry.registerCommands(client);
	}
});


client.on('messageCreate', async (receivedMessage) => {
	let message = receivedMessage.content.toLowerCase();
	var user = receivedMessage.author;
	//Ignore messages that don't start with prefix
	if (!message.startsWith(config.discord.prefix)) {
		return;
	}
	//Ignore DMs
	if (receivedMessage.channel.type === ChannelType.DM) {
		return;
	}
	//Ignore bot messages
	if (user.bot === true) {
		return;
	}
	//Not in channel list
	if (receivedMessage.channel.type === ChannelType.GuildText && !config.discord.channelIDs.includes(receivedMessage.channel.id)) {
		return;
	}
	let userPerms = config.discord.adminIDs.includes(receivedMessage.author.id) ? ['admin'] : await Roles.getUserCommandPerms(receivedMessage.guild, user);
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
			Truncate.sendTruncateMessage(receivedMessage.channel);
		}
	}
	//Run Scripts
	else if (config.discord.scriptCommand && message === `${config.discord.prefix}${config.discord.scriptCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('scripts')) {
			Scripts.sendScriptList(receivedMessage, 'new');
		}
	}
	//Run Queries
	else if (config.madDB.host && config.discord.queryCommand && message === `${config.discord.prefix}${config.discord.queryCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('queries')) {
			Queries.queries(receivedMessage.channel);
		}
	}
	//Send Links
	else if (config.discord.linksCommand && message === `${config.discord.prefix}${config.discord.linksCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('links')) {
			Links.links(client, receivedMessage.channel);
		}
	}
	//Device Info All
	else if (config.madDB.host && config.discord.devicesCommand && message === `${config.discord.prefix}${config.discord.devicesCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
			Devices.deviceStatus(receivedMessage.channel, receivedMessage.author);
		}
	}
	//No Proto Devices
	else if (config.madDB.host && config.discord.noProtoCommand && message === `${config.discord.prefix}${config.discord.noProtoCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
			Devices.noProtoDevices(client, receivedMessage.channel, receivedMessage.author, 'search');
		}
	}
	//Send Worker
	else if (config.stats.database.host && config.deviceControl.path && config.discord.sendWorkerCommand && message.startsWith(`${config.discord.prefix}${config.discord.sendWorkerCommand} `)) {
		if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl')) {
			DeviceControl.sendWorker(client, receivedMessage.channel, receivedMessage.author, receivedMessage.content);
		}
	}
	//Stats
	else if (config.stats.database.host && config.discord.systemStatsCommand && message === `${config.discord.prefix}${config.discord.systemStatsCommand}`) {
		if (userPerms.includes('admin') || userPerms.includes('systemStats')) {
			Stats.stats(client, receivedMessage.channel, receivedMessage.author);
		}
	}
	//Events
	else if (config.madDB.host && config.discord.eventsCommand && message === `${config.discord.prefix}${config.discord.eventsCommand}`) {
		if (config.truncate.eventAutomation === true && config.truncate.eventGuildID) {
			Events.listEvents(client, receivedMessage.channel);
		}
	}
	//Geofence Converter
	else if (config.madDB.host && config.discord.geofenceCommand && message === `${config.discord.prefix}${config.discord.geofenceCommand}`) {
		Geofences.converterMain(receivedMessage.channel, receivedMessage.author);
	}
	//Help Menu
	else if (config.discord.helpCommand && receivedMessage.channel.type !== ChannelType.DM && message === `${config.discord.prefix}${config.discord.helpCommand}`) {
		Help.helpMenu(client, receivedMessage.channel, receivedMessage.guild, receivedMessage.author);
	}
	//Specific Device Info
	else if (userPerms.includes('admin') || userPerms.includes('deviceInfoControl') || userPerms.includes('deviceInfo')) {
		let dbInfo = require('./MAD_Database_Info.json');
		for (const [key, value] of Object.entries(dbInfo.devices)) {
			if (receivedMessage.content.toLowerCase() === `${config.discord.prefix}${value.name.toLowerCase()}`) {
				Devices.getDeviceInfo(receivedMessage.channel, receivedMessage.author, key);
			}
		}
	}
}); //End of client.on(message)


client.on('interactionCreate', async interaction => {
	if (interaction.type !== InteractionType.MessageComponent) {
		return;
	}
	if (interaction.message.guildId === null) {
		return;
	}
	let user = interaction.member;
	//Verify interaction
	if (!interaction.customId.startsWith(config.serverName)) {
		return;
	}
	var interactionID = interaction.customId.replace(`${config.serverName}~`, '');
	let userPerms = config.discord.adminIDs.includes(user.id) ? ['admin'] : await Roles.getUserCommandPerms(interaction.message.guild, user);
	//Button interaction
	if (interaction.isButton()) {
		Interactions.buttonInteraction(interaction, interactionID, userPerms);
	}
	//List interaction
	else if (interaction.isSelectMenu()) {
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


//Slash commands
client.on('interactionCreate', async interaction => {
	if (interaction.type !== InteractionType.ApplicationCommand) {
		return;
	}
	let user = interaction.user;
	if (user.bot == true) {
		return;
	}
	const command = client.commands.get(interaction.commandName);
	if (!command) {
		return;
	}

	//Not in channel list
	if (!config.discord.channelIDs.includes(interaction.channelId)) {
		interaction.reply(`Slash commands not allowed in channel *${interaction.channelId}*`);
		return;
	}

	try {
		let slashReturn = await command.execute(client, interaction);
		try {
			if (slashReturn === 'delete') {
				interaction.deleteReply().catch(err);
			}
		} catch (err) {}
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: 'There was an error while executing this command!',
			ephemeral: true
		}).catch(console.error);
	}
});

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.login(config.discord.token);