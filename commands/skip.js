import { SlashCommandBuilder } from "discord.js";
import { skip } from "../music/player.js";

export const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the current track");

export async function execute(interaction) {
  skip(interaction.guildId);
  await interaction.reply("Skipped.");
}
