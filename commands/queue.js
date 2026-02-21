import { SlashCommandBuilder } from "discord.js";
import { getQueue } from "../music/player.js";

export const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Show the queue");

export async function execute(interaction) {
  const q = getQueue(interaction.guildId);
  if (!q.length) return interaction.reply("Queue is empty.");

  const preview = q.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}`).join("\n");
  await interaction.reply(`**Up next:**\n${preview}${q.length > 10 ? `\n…and ${q.length - 10} more` : ""}`);
}
