export const structureTypes = {
  settlement: 'settlement',
  city: 'city',
  road: 'road',
  devCard: 'devCard',
}

export const ResourceTypes = {
  brick: 'brick',
  wood: 'wood',
  sheep: 'sheep',
  wheat: 'wheat',
  ore: 'ore',
  desert: 'desert',
}

export function getCosts(type) {
  if (type == structureTypes.settlement) {
    return {
      [ResourceTypes.brick]: 1,
      [ResourceTypes.wood]: 1,
      [ResourceTypes.sheep]: 1,
      [ResourceTypes.wheat]: 1,
      [ResourceTypes.ore]: 0,
    }
  }
  if (type == structureTypes.city) {
    return {
      [ResourceTypes.brick]: 0,
      [ResourceTypes.wood]: 0,
      [ResourceTypes.sheep]: 0,
      [ResourceTypes.wheat]: 2,
      [ResourceTypes.ore]: 3,
    }
  }
  if (type == structureTypes.road) {
    return {
      [ResourceTypes.brick]: 1,
      [ResourceTypes.wood]: 1,
      [ResourceTypes.sheep]: 0,
      [ResourceTypes.wheat]: 0,
      [ResourceTypes.ore]: 0,
    }
  }
  if (type == structureTypes.devCard) {
    return {
      [ResourceTypes.brick]: 0,
      [ResourceTypes.wood]: 0,
      [ResourceTypes.sheep]: 1,
      [ResourceTypes.wheat]: 1,
      [ResourceTypes.ore]: 1,
    }
  }
}

const INITIAL_TILE_COUNTS = new Map([
  [ResourceTypes.wheat, 4],
  [ResourceTypes.ore, 3],
  [ResourceTypes.sheep, 4],
  [ResourceTypes.wood, 4],
  [ResourceTypes.brick, 3],
  [ResourceTypes.desert, 1],
]);
const INITIAL_TILES = [];
for (const [resource, count] of INITIAL_TILE_COUNTS) {
  for (let i=0; i<count; i++) INITIAL_TILES.push(resource);
}

// https://stackoverflow.com/a/12646864/8636225
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function getShuffledResourceTiles() {
  return shuffleArray(INITIAL_TILES.slice());
}

// https://boardgamegeek.com/image/350486/droberts441
export const NUMBER_TILES = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];
