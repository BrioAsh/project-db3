// Gestion des modules
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const Database = require("./database");

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Initialiser la base de données
client.database = new Database();

// Gestion des commandes
client.commands = new Collection();
const folderPath = path.join(__dirname, "./commands");
const commandsFolders = fs.readdirSync(folderPath);

for (const folder of commandsFolders) {
  const commandPath = path.join(folderPath, folder);
  const commandFiles = fs
    .readdirSync(commandPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      command.filePath = filePath;
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property`
      );
    }
  }
}

// Gestion des évènements
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Gestion de la fermeture propre
process.on("SIGINT", async () => {
  console.log("\n🔄 Arrêt du bot en cours...");
  await client.database.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🔄 Arrêt du bot en cours...");
  await client.database.close();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
