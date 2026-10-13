module.exports = {
name: "Message XP Event",
description: "Triggers when a user sends a message and outputs XP, user ID, and guild ID.",
category: "Events",
auto_execute: true,


inputs: [],


options: [
{
id: "min_length",
name: "Minimum message length",
type: "NUMBER",
defaultValue: 5,
},
{
id: "cooldown",
name: "Cooldown in seconds",
type: "NUMBER",
defaultValue: 60,
},
{
id: "xp_amount",
name: "XP to award per message",
type: "NUMBER",
defaultValue: 10,
}
],


outputs: [
{
id: "user",
name: "User ID",
types: ["text", "unspecified"],
},
{
id: "guild",
name: "Guild ID",
types: ["text", "unspecified"],
},
{
id: "xp",
name: "XP Awarded",
types: ["number", "unspecified"],
},
{
id: "action",
name: "Action",
types: ["action"],
}
],


code(cache) {
const cooldown = parseInt(this.GetOptionValue("cooldown", cache)) || 60;
const minLength = parseInt(this.GetOptionValue("min_length", cache)) || 5;
const xp = parseInt(this.GetOptionValue("xp_amount", cache)) || 10;


const { Events } = require("discord.js");
const cooldowns = new Map();


this.client.on(Events.MessageCreate, (msg) => {
if (!msg.guild) return;
if (msg.author.bot) return;
if (!msg.content || msg.content.length < minLength) return;


const key = `${msg.guild.id}-${msg.author.id}`;
const now = Date.now();


if (cooldowns.has(key) && now - cooldowns.get(key) < cooldown * 1000) return;
cooldowns.set(key, now);


// Output values
this.StoreOutputValue(msg.author.id, "user", cache);
this.StoreOutputValue(msg.guild.id, "guild", cache);
this.StoreOutputValue(xp, "xp", cache);


this.RunNextBlock("action", cache);
});
},
};