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
      playNext(guildId).catch(() => {});
    });

    player.on("error", (e) => {
      state.playing = false;
      playNext(guildId).catch(() => {});
    });

    guildPlayers.set(guildId, state);
  }
  return guildPlayers.get(guildId);
}

export async function connectToVoice(interaction) {
  const member = interaction.member;
  const channel = member?.voice?.channel;
  if (!channel) throw new Error("Join a voice channel first.");

  const state = getGuildState(interaction.guildId);

  state.connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: interaction.guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator
  });

  await entersState(state.connection, VoiceConnectionStatus.Ready, 20_000);

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

  if (!state.playing) {
    await playNext(guildId);
  }
}

export async function playNext(guildId) {
  const state = getGuildState(guildId);
  const next = state.queue.shift();

  if (!next) {
    state.playing = false;
    return;
  }

  state.playing = true;

  // Stream audio from YouTube via play-dl
  const stream = await play.stream(next.url);
  const resource = createAudioResource(stream.stream, { inputType: stream.type });

  state.player.play(resource);
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
