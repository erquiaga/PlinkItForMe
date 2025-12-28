export const Genre = {
  Action: 'Action',
  Adventure: 'Adventure',
  Animation: 'Animation',
  Comedy: 'Comedy',
  Crime: 'Crime',
  Documentary: 'Documentary',
  Drama: 'Drama',
  Family: 'Family',
  Fantasy: 'Fantasy',
  History: 'History',
  Horror: 'Horror',
  Music: 'Music',
  Mystery: 'Mystery',
  Romance: 'Romance',
  Science_Fiction: 'Science Fiction',
  Thriller: 'Thriller',
  TV_Movie: 'TV Movie',
  War: 'War',
  Western: 'Western',
} as const;

export type Genre = (typeof Genre)[keyof typeof Genre];

export const Decade = {
  '2020s': '2020s',
  '2010s': '2010s',
  '2000s': '2000s',
  '1990s': '1990s',
  '1980s': '1980s',
  '1970s': '1970s',
  '1960s': '1960s',
  '1950s': '1950s',
  '1940s': '1940s',
  '1930s': '1930s',
  '1920s': '1920s',
  '1910s': '1910s',
  '1900s': '1900s',
} as const;

export type Decade = (typeof Decade)[keyof typeof Decade];
