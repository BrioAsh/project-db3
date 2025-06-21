const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulse un membre')
        .addUserOption(option => option.setName('membre').setDescription('Le membre à expulser').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ 
                content: 'Tu n\'as pas les permissions nécessaires !', 
                flags: MessageFlags.Ephemeral 
            });
        }
        
        const member = interaction.options.getMember('membre');
        if (!member.kickable) {
            return interaction.reply('Je ne peux pas expulser ce membre !');
        }
        
        // Reste de la logique...
    },
};