const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignorer les bots et les messages privés
        if (message.author.bot || !message.guild) return;

        const database = message.client.database;
        const userId = message.author.id;
        const guildId = message.guild.id;

        try {
            // Vérifier si le système de niveau est activé pour ce serveur
            const guildConfig = await database.getGuildConfig(guildId);
            if (guildConfig && !guildConfig.level_up_messages) return;

            // Générer un montant d'XP aléatoire (15-25 XP par message)
            const xpGain = Math.floor(Math.random() * 11) + 15;

            // Ajouter l'XP
            const result = await database.addXP(userId, guildId, xpGain);

            // Si l'utilisateur a gagné un niveau
            if (result.levelUp) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 Niveau supérieur !')
                    .setColor('#00ff00')
                    .setDescription(`Félicitations ${message.author} !\nTu viens d'atteindre le **niveau ${result.newLevel}** !`)
                    .addFields(
                        { name: '📊 Ancien niveau', value: `${result.previousLevel}`, inline: true },
                        { name: '📈 Nouveau niveau', value: `${result.newLevel}`, inline: true },
                        { name: '⭐ XP Total', value: `${result.newXP}`, inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setFooter({ text: 'Continue comme ça !', iconURL: message.client.user.displayAvatarURL() });

                // Envoyer le message de level up
                const levelUpMessage = await message.channel.send({ embeds: [embed] });

                // Supprimer le message après 10 secondes
                setTimeout(async () => {
                    try {
                        await levelUpMessage.delete();
                    } catch (error) {
                        console.error('Erreur lors de la suppression du message de level up:', error);
                    }
                }, 10000);

                // Récompense en pièces pour le level up (optionnel)
                if (guildConfig?.economy_enabled) {
                    const coinReward = result.newLevel * 50; // 50 pièces par niveau
                    await database.addCoins(userId, guildId, coinReward, 'Level up reward');
                }
            }

        } catch (error) {
            console.error('Erreur dans le système de niveaux:', error);
        }
    },
};