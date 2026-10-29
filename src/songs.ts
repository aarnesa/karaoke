export interface Song {
  id: string;
  title: string;
  artist: string;
}

export function parseSongs(value: unknown): Song[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Laululista on tyhjä tai väärässä muodossa.');
  }
  const ids = new Set<string>();
  return value.map((song: unknown) => {
    if (
      typeof song !== 'object' || song === null ||
      !('id' in song) || typeof song.id !== 'string' || !/^[\w-]{11}$/.test(song.id) ||
      !('title' in song) || typeof song.title !== 'string' || !song.title.trim() ||
      !('artist' in song) || typeof song.artist !== 'string' || !song.artist.trim() ||
      ids.has(song.id)
    ) {
      throw new Error('Tarkista laulujen tunnukset, nimet ja esittäjät. Tunnusten pitää olla yksilöllisiä.');
    }
    ids.add(song.id);
    return { id: song.id, title: song.title.trim(), artist: song.artist.trim() };
  });
}
