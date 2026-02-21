import "dotenv/config";
import { REST, Routes } from "discord.js";
import fs from "node:fs";
import path from "node:path";

const commands = [];
const commandsPath = path.join(process.cwd(), "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const cmd = await import(`../commands/${file}`);
  commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!clientId) throw new Error("Missing DISCORD_CLIENT_ID");

(async () => {
  if (guildId) {
    // Fast iteration (updates appear almost instantly)
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("Registered guild commands.");
  } else {
    // Global (can take a while to propagate)
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Registered global commands.");
  }
})();
