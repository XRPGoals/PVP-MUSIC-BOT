import { SlashCommandBuilder } from "discord.js";
import { pause } from "../music/player.js";

export const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause playback");

export async function execute(interaction) {
  pause(interaction.guildId);
  await interaction.reply("Paused.");
}
