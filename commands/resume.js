import { SlashCommandBuilder } from "discord.js";
import { resume } from "../music/player.js";

export const data = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Resume playback");

export async function execute(interaction) {
  resume(interaction.guildId);
  await interaction.reply("Resumed.");
}
