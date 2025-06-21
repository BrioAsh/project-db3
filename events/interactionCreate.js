const { Events, MessageFlags } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
    // Check if the interaction is a command and not a subcommand
	    if (!interaction.isChatInputCommand()) return;

	    const command = interaction.client.commands.get(interaction.commandName);

	    if (!command) {
		    console.error(`No command matching ${interaction.commandName} was found.`);
		    return;
	    }

	    try {
		    await command.execute(interaction);
	    } catch (error) {
		    console.error(`Erreur avec la commande ${interaction.commandName}:`, error);

			const errorEmbed = new EmbedBuilder()
			    .setTitle('❌ Erreur')
				.setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
				.setColor('#ff0000')
				.setTimestamp();

			const reply = { embeds: [errorEmbed], flags: MessageFlags.Ephemeral };

		    if (interaction.replied || interaction.deferred) {
			    await interaction.followUp(reply);
		    } else {
			    await interaction.reply(reply);
		    }
        }
    }
};