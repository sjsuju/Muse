export function spotifySearchPath(query: string): string {
  return `/search?q=${encodeURIComponent(query)}&type=track,album,playlist&limit=10`
}
