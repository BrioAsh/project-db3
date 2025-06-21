const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true)),
	async execute(interaction) {
        const commandName = interaction.options.getString('command', true).toLowerCase();
        const command = interaction.client.commands.get(commandName);
        
        if (!command) {
            return interaction.reply(`The command \`${commandName}\` does not exist.`);
        }

		if (!command.filePath) {
			return interaction.reply({ content: `Impossible de recharger la commande \`${commandName}\` car il n'a pas de chemin de fichier.`, flags: MessageFlags.Ephemeral });
		}

		delete require.cache[require.resolve(command.filePath)];

        try {
	        const newCommand = require(command.filePath);
	        interaction.client.commands.set(newCommand.data.name, newCommand);
			newCommand.filePath = command.filePath;
	        
			await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
			await wait(15000), interaction.deleteReply();
        } catch (error) {
	        console.error(error);
	        await interaction.reply(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
        }
	},
};