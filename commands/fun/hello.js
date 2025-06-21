const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Répond avec "hey!"'),
    async execute(interaction) {
        await interaction.reply('Hey!');
    },
};