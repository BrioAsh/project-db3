const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Répond avec "hey!"'),
    async execute(interaction) {
        await interaction.reply('Hey!');
        await wait(15000), interaction.deleteReply();
    },
};