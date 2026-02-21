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

  try {
    const query = interaction.options.getString("query", true);

    // Optional: quick debug so you can see it got past defer
    // await interaction.editReply(`Searching: **${query}** ...`);

    await connectToVoice(interaction);

    const resolved = await resolveToTrack(query);
    await enqueueAndPlay(interaction.guildId, resolved);

    if (resolved.multi) {
      await interaction.editReply(`Queued **${resolved.tracks.length}** tracks from **${resolved.title}**.`);
    } else {
      await interaction.editReply(`Queued: **${resolved.title}**`);
    }
  } catch (e) {
    console.error("PLAY COMMAND ERROR:", e);

    const msg =
      e?.message
        ? `❌ ${e.message}`
        : "❌ Play failed (unknown error). Check Railway logs.";

    // Always answer the interaction
    await interaction.editReply(msg);
  }
}
