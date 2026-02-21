import { SlashCommandBuilder } from "discord.js";
import { connectToVoice, enqueueAndPlay } from "../music/player.js";
import { resolveToTrack } from "../music/resolvers.js";

export const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play YouTube/Spotify URL or search query")
  .addStringOption(o =>
    o.setName("query")
     .setDescription("YouTube URL, Spotify URL, or search text")
     .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const query = interaction.options.getString("query", true);

  await connectToVoice(interaction);

  const resolved = await resolveToTrack(query);
  await enqueueAndPlay(interaction.guildId, resolved);

  if (resolved.multi) {
    await interaction.editReply(`Queued **${resolved.tracks.length}** tracks from **${resolved.title}**.`);
  } else {
    await interaction.editReply(`Queued: **${resolved.title}**`);
  }
}
