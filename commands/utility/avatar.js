const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Affiche l\'avatar d\'un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur ciblé')
                .setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('utilisateur') ?? interaction.user;
        
        const embed = new EmbedBuilder()
            .setTitle(`Avatar de ${user.displayName}`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor('#5865F2');
            
        await interaction.reply({ embeds: [embed] });
    },
};