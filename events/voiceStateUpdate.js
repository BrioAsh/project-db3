const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const database = newState.client.database;
    const userId = newState.member.user.id;
    const guildId = newState.guild.id;

    // Ignorer les bots
    if (newState.member.user.bot) return;

    try {
      // Vérifier si le système de niveau est activé pour ce serveur
      const guildConfig = await database.getGuildConfig(guildId);
      if (guildConfig && !guildConfig.level_up_messages) return;

      // Utilisateur rejoint un canal vocal
      if (!oldState.channel && newState.channel) {
        console.log(
          `${newState.member.user.username} a rejoint le canal vocal ${newState.channel.name}`
        );

        // Démarrer le suivi du temps vocal
        await database.startVoiceSession(userId, guildId);
      }
      // Utilisateur quitte un canal vocal
      else if (oldState.channel && !newState.channel) {
        console.log(
          `${newState.member.user.username} a quitté le canal vocal ${oldState.channel.name}`
        );

        // Calculer et donner l'XP pour le temps passé en vocal
        const result = await database.endVoiceSession(userId, guildId);

        if (result && result.xpGained > 0) {
          // Envoyer un message dans le canal général ou un canal spécifique
          const channel = newState.guild.channels.cache.find(
            (c) =>
              c.name.includes("général") ||
              c.name.includes("general") ||
              c.type === 0 // Canal texte
          );

          if (channel) {
            const embed = new EmbedBuilder()
              .setTitle("🎤 XP Vocal Gagné !")
              .setColor("#9b59b6")
              .setDescription(
                `${newState.member.user} a gagné **${result.xpGained} XP** pour avoir passé **${result.timeSpent}** en vocal !`
              )
              .addFields(
                {
                  name: "⏱️ Temps passé",
                  value: result.timeSpent,
                  inline: true,
                },
                {
                  name: "⭐ XP gagné",
                  value: `${result.xpGained}`,
                  inline: true,
                },
                {
                  name: "📊 XP Total",
                  value: `${result.totalXP}`,
                  inline: true,
                }
              )
              .setThumbnail(newState.member.user.displayAvatarURL())
              .setFooter({
                text: "Continue à discuter avec tes amis !",
                iconURL: newState.client.user.displayAvatarURL(),
              });

            const voiceMessage = await channel.send({ embeds: [embed] });

            // Supprimer le message après 15 secondes
            setTimeout(async () => {
              try {
                await voiceMessage.delete();
              } catch (error) {
                console.error(
                  "Erreur lors de la suppression du message vocal XP:",
                  error
                );
              }
            }, 15000);
          }

          // Vérifier si l'utilisateur a gagné un niveau avec cet XP
          if (result.levelUp) {
            const levelUpEmbed = new EmbedBuilder()
              .setTitle("🎉 Niveau supérieur grâce au vocal !")
              .setColor("#00ff00")
              .setDescription(
                `Félicitations ${newState.member.user} !\nTu viens d'atteindre le **niveau ${result.newLevel}** grâce à ton activité vocale !`
              )
              .addFields(
                {
                  name: "📊 Ancien niveau",
                  value: `${result.previousLevel}`,
                  inline: true,
                },
                {
                  name: "📈 Nouveau niveau",
                  value: `${result.newLevel}`,
                  inline: true,
                },
                {
                  name: "⭐ XP Total",
                  value: `${result.totalXP}`,
                  inline: true,
                }
              )
              .setThumbnail(newState.member.user.displayAvatarURL())
              .setFooter({
                text: "Continue comme ça !",
                iconURL: newState.client.user.displayAvatarURL(),
              });

            if (channel) {
              const levelUpMessage = await channel.send({
                embeds: [levelUpEmbed],
              });

              // Supprimer le message après 20 secondes
              setTimeout(async () => {
                try {
                  await levelUpMessage.delete();
                } catch (error) {
                  console.error(
                    "Erreur lors de la suppression du message de level up vocal:",
                    error
                  );
                }
              }, 20000);

              // Récompense en pièces pour le level up (optionnel)
              if (guildConfig?.economy_enabled) {
                const coinReward = result.newLevel * 75; // 75 pièces par niveau (plus que les messages)
                await database.addCoins(
                  userId,
                  guildId,
                  coinReward,
                  "Voice level up reward"
                );
              }
            }
          }
        }
      }
      // Utilisateur change de canal vocal
      else if (
        oldState.channel &&
        newState.channel &&
        oldState.channel.id !== newState.channel.id
      ) {
        console.log(
          `${newState.member.user.username} a changé du canal ${oldState.channel.name} vers ${newState.channel.name}`
        );

        // Pas besoin de faire quelque chose de spécial, on continue juste le suivi
        // Optionnel: redémarrer la session si vous voulez traquer les changements de canal
        // await database.updateVoiceChannel(userId, guildId, newState.channel.id);
      }
    } catch (error) {
      console.error("Erreur dans le système XP vocal:", error);
    }
  },
};
