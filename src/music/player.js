import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus
} from "@discordjs/voice";
import play from "play-dl";

const guildPlayers = new Map(); // guildId -> state

export function getGuildState(guildId) {
  if (!guildPlayers.has(guildId)) {
    const player = createAudioPlayer();
    const state = {
      player,
      connection: null,
      queue: [],
      playing: false
    };

    player.on(AudioPlayerStatus.Idle, () => {
      state.playing = false;
      playNext(guildId).catch((e) => console.error("playNext error (Idle):", e));
    });

    player.on("error", (e) => {
      console.error("Audio player error:", e);
      state.playing = false;
      playNext(guildId).catch((err) => console.error("playNext error (player error):", err));
    });

    guildPlayers.set(guildId, state);
  }
  return guildPlayers.get(guildId);
}

export async function connectToVoice(interaction) {
  console.log("connectToVoice: start", {
    guildId: interaction.guildId,
    user: interaction.user?.tag
  });

  const member = interaction.member;
  const channel = member?.voice?.channel;
  if (!channel) throw new Error("Join a voice channel first.");

  console.log("connectToVoice: user channel", {
    channelId: channel.id,
    channelName: channel.name
  });

  const state = getGuildState(interaction.guildId);

  // If already connected, reuse it
  if (state.connection) {
    console.log("connectToVoice: reusing existing connection");
    return state;
  }

  state.connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true
  });

  // Helpful diagnostics
  state.connection.on(VoiceConnectionStatus.Disconnected, async () => {
    console.log("VoiceConnectionStatus: Disconnected");
    try {
      // Sometimes Discord voice disconnects briefly; try to recover
      await Promise.race([
        entersState(state.connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(state.connection, VoiceConnectionStatus.Connecting, 5_000)
      ]);
      console.log("VoiceConnectionStatus: recovered from disconnect");
    } catch {
      console.log("VoiceConnectionStatus: disconnect could not recover, destroying connection");
      state.connection.destroy();
      state.connection = null;
    }
  });

  state.connection.on(VoiceConnectionStatus.Ready, () => {
    console.log("VoiceConnectionStatus: Ready");
  });

  state.connection.on("error", (e) => {
    console.error("Voice connection error:", e);
  });

  try {
    await entersState(state.connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (e) {
    console.error("connectToVoice: failed to become Ready within 20s", e);
    // Important: clean up so next attempt can retry
    try { state.connection.destroy(); } catch {}
    state.connection = null;
    throw new Error("Failed to connect to voice (timeout). Check bot voice permissions / region / Railway networking.");
  }

  state.connection.subscribe(state.player);
  return state;
}

export async function enqueueAndPlay(guildId, track) {
  const state = getGuildState(guildId);

  if (track.multi) {
    state.queue.push(...track.tracks);
  } else {
    state.queue.push(track);
  }

  console.log("enqueueAndPlay:", {
    guildId,
    queued: track.multi ? track.tracks.length : 1,
    queueLen: state.queue.length,
    playing: state.playing
  });

  if (!state.playing) {
    await playNext(guildId);
  }
}

export async function playNext(guildId) {
  const state = getGuildState(guildId);
  const next = state.queue.shift();

  if (!next) {
    state.playing = false;
    console.log("playNext: queue empty");
    return;
  }

  state.playing = true;
  console.log("playNext: starting", { guildId, title: next.title, url: next.url });

  try {
    // Stream audio from YouTube via play-dl
    const stream = await play.stream(next.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    state.player.play(resource);
  } catch (e) {
    console.error("playNext: failed to stream", { url: next.url, err: e });
    state.playing = false;

    // Try the next track so the bot doesn't get stuck
    await playNext(guildId);
  }
}

export function skip(guildId) {
  const state = getGuildState(guildId);
  state.player.stop(true);
}

export function stop(guildId) {
  const state = getGuildState(guildId);
  state.queue.length = 0;
  state.player.stop(true);
  state.connection?.destroy();
  state.connection = null;
}

export function pause(guildId) {
  const state = getGuildState(guildId);
  state.player.pause();
}

export function resume(guildId) {
  const state = getGuildState(guildId);
  state.player.unpause();
}

export function getQueue(guildId) {
  return getGuildState(guildId).queue;
}
