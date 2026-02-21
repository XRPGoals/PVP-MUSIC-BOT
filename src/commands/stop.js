import { SlashCommandBuilder } from "discord.js";
import { stop } from "../music/player.js";

export const data = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stop playback and clear the queue");

export async function execute(interaction) {
  stop(interaction.guildId);
  await interaction.reply("Stopped and cleared the queue.");
}
