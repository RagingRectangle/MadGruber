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
const config = require('../config/config.json');
const roleConfig = require('../config/roles.json');

module.exports = {
   roles: async function roles(reaction, user, type) {
      roleConfig.forEach(role => {
         if (role.messageID === reaction.message.id) {
            role.roles.forEach(async emoji => {
               if (emoji.emojiName === reaction._emoji.name) {
                  let guildUser = await reaction.message.guild.members.cache.find(m => m.id === user.id);
                  let newRole = await reaction.message.guild.roles.cache.find(r => r.id === emoji.roleID);
                  if (!newRole){
                     console.log(`Error fetching role for ${emoji.emojiName}`);
                     return;
                  }
                  var errorCheck = false;
                  if (type === 'add') {
                     guildUser.roles.add(newRole).catch(err => {
                           console.log(`Error giving ${newRole.name} role to user ${user.username}: ${err}`);
                           errorCheck = true;
                        }).catch(console.error)
                        .then(() => {
                           if (errorCheck !== true) {
                              console.log(`${user.username} added ${newRole.name} role`);
                              if (config.roles.sendRoleMessage === true) {
                                 reaction.message.channel.send(`${user} has added the ${newRole.name} role.`).catch(console.error)
                                    .then(msg => {
                                       if (config.roles.roleMessageDeleteSeconds > 0) {
                                          setTimeout(() => msg.delete().catch(err => console.log("Error deleting role message:", err)), (config.roles.roleMessageDeleteSeconds * 1000))
                                       }
                                    })
                              }
                           }
                        });
                  } //End of role added
                  else {
                     guildUser.roles.remove(newRole).catch(err => {
                           console.log(`Error removing ${newRole.name} role to user ${user.username}: ${err}`);
                           errorCheck = true;
                        }).catch(console.error)
                        .then(() => {
                           if (errorCheck !== true) {
                              console.log(`${user.username} removed ${newRole.name} role`);
                              if (config.roles.sendRoleMessage === true) {
                                 reaction.message.channel.send(`${user} has removed the ${newRole.name} role.`).catch(console.error)
                                    .then(msg => {
                                       if (config.roles.roleMessageDeleteSeconds > 0) {
                                          setTimeout(() => msg.delete().catch(err => console.log("Error deleting role message:", err)), (config.roles.roleMessageDeleteSeconds * 1000))
                                       }
                                    })
                              }
                           }
                        })
                  } //End of role removed
               }
            }) //End of forEach(emoji)
         }
      }) //End of forEach(role)
   }, //End of roles()


   getUserCommandPerms: async function getUserCommandPerms(guild, user) {
      var userPerms = [];
      if (config.discord.adminIDs.includes(user.id)) {
         userPerms.push("admin");
      }
      let member = await guild.members.fetch(user.id).catch(err => {
         console.log(err);
      });
      if (member !== undefined) {
         let memberRoles = member._roles;
         let commandTypes = Object.keys(config.roles.commandPermRoles);
         let commandRoles = Object.values(config.roles.commandPermRoles);
         for (var t in commandTypes) {
            if (userPerms.includes('admin')) {
               userPerms.push(commandTypes[t]);
            } else {
               let roles = commandRoles[t];
               for (var r in roles) {
                  if (memberRoles && memberRoles.includes(roles[r])) {
                     userPerms.push(commandTypes[t]);
                  }
               } //End of r loop
            }
         } //End of t loop
      }
      return userPerms;
   } //End of getUserCommandPerms()
}