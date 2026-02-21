import play from "play-dl";

export async function resolveToTrack(queryOrUrl) {
  // 1) If it's Spotify, resolve metadata then search YouTube
  if (queryOrUrl.includes("open.spotify.com/")) {
    const sp = await play.spotify(queryOrUrl);

    // Track
    if (sp?.type === "track") {
      const search = `${sp.name} ${sp.artists?.map(a => a.name).join(" ")}`;
      const yt = await searchYouTubeBest(search);
      return { title: `${sp.name} - ${sp.artists?.map(a => a.name).join(", ")}`, url: yt.url };
    }

    // Playlist/Album: return multiple tracks (queue them)
    if (sp?.type === "playlist" || sp?.type === "album") {
      const tracks = await sp.all_tracks(); // play-dl helper for playlists/albums
      const results = [];
      for (const t of tracks) {
        const search = `${t.name} ${t.artists?.map(a => a.name).join(" ")}`;
        const yt = await searchYouTubeBest(search);
        results.push({ title: `${t.name} - ${t.artists?.map(a => a.name).join(", ")}`, url: yt.url });
      }
      return { multi: true, tracks: results, title: sp.name };
    }

    throw new Error("Unsupported Spotify link type.");
  }

  // 2) If it's a YouTube URL, use it directly
  if (play.yt_validate(queryOrUrl) === "video") {
    const info = await play.video_info(queryOrUrl);
    return { title: info.video_details.title, url: queryOrUrl };
  }

  // 3) Otherwise treat as a search string
  const yt = await searchYouTubeBest(queryOrUrl);
  return { title: yt.title, url: yt.url };
}

async function searchYouTubeBest(search) {
  const results = await play.search(search, { limit: 1 });
  if (!results?.length) throw new Error("No YouTube results found.");
  return { title: results[0].title, url: results[0].url };
}
