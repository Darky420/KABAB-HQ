const TENOR_API_KEY = "L6V78593E9V3"; // Public testing key
const TENOR_CLIENT_KEY = "kabab_hq_app";
 
export interface GifObject {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}
 
export interface StickerObject {
  id: string;
  url: string;
  name: string;
}
 
// Placeholder stickers (using the ones we generated + some public ones)
export const STICKERS_LIBRARY: StickerObject[] = [
  { 
    id: "sticker_1", 
    name: "Kabab Monkey", 
    url: "https://i.ibb.co/vzR0jXJ/kabab-monkey.png" // Using IBB for now to have public URL
  },
  { 
    id: "sticker_2", 
    name: "Cyber Flame", 
    url: "https://i.ibb.co/6y4GZp4/kabab-flame.png"
  },
  {
    id: "sticker_3",
    name: "Kabab Gang Logo",
    url: "https://i.ibb.co/Pmkq3kM/logo.png"
  }
];
 
export const fetchTrendingGifs = async (): Promise<GifObject[]> => {
  try {
    const response = await fetch(
      `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
    );
    const data = await response.json();
    return data.results.map((item: any) => ({
      id: item.id,
      url: item.media_formats.gif.url,
      previewUrl: item.media_formats.tinygif.url,
      title: item.title
    }));
  } catch (error) {
    console.error("Tenor API Error:", error);
    return [];
  }
};
 
export const searchGifs = async (query: string): Promise<GifObject[]> => {
  if (!query) return fetchTrendingGifs();
  try {
    const response = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${query}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
    );
    const data = await response.json();
    return data.results.map((item: any) => ({
      id: item.id,
      url: item.media_formats.gif.url,
      previewUrl: item.media_formats.tinygif.url,
      title: item.title
    }));
  } catch (error) {
    console.error("Tenor API Error:", error);
    return [];
  }
};
