import {XyCoord, getHexVertexes, ResourceTypes} from './helpers.js';

const HEX_TILE_CENTER_POINTS = [
  new XyCoord(2, 0),
  new XyCoord(1, 1.5),
  new XyCoord(0, 3),
  new XyCoord(1, 4.5),
  new XyCoord(2, 6),
  new XyCoord(4, 6),
  new XyCoord(6, 6),
  new XyCoord(7, 4.5),
  new XyCoord(8, 3),
  new XyCoord(7, 1.5),
  new XyCoord(6, 0),
  new XyCoord(4, 0),
  new XyCoord(3, 1.5),
  new XyCoord(2, 3),
  new XyCoord(3, 4.5),
  new XyCoord(5, 4.5),
  new XyCoord(6, 3),
  new XyCoord(5, 1.5),
  new XyCoord(4, 3),
];

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

class Tile {
  // number is dice number
  constructor(drawUtils, coord, resource, number) {
    this.drawUtils = drawUtils;
    this.resource = resource;
    this.number = number;
    this.coord = coord;
  }

  getResourceName() {
    return this.resource;
  }

  draw() {
    this.drawUtils.drawHex(this.coord, this.resource);
    if (this.number) {
      this.drawUtils.drawNumberTile(this.coord, this.number);
    }
  }
}

class Board {
  constructor(drawUtils) {
    this.drawUtils = drawUtils;

    this.occupiedVertexes = new Map();  // Map<ptHash, Player>
    this.occupiedEdges = new Map();  // Map<ptHash, Player>
    this.vertexesByMidpoint = new Map();  // Map<hash, [pt1, pt2]>
    for (const centerCoord of HEX_TILE_CENTER_POINTS) {
      const vertexes = getHexVertexes(centerCoord);
      for (let i=0; i<5; i++) {
        const hash = XyCoord.averageCoords([vertexes[i], vertexes[i+1]]).hash();
        this.occupiedEdges.set(hash, null);
        this.vertexesByMidpoint.set(hash, [vertexes[i], vertexes[i+1]]);
      }
      const hash = XyCoord.averageCoords([vertexes[5], vertexes[0]]).hash();
      this.occupiedEdges.set(hash, null);
      this.vertexesByMidpoint.set(hash, [vertexes[5], vertexes[0]]);

      for (const vertex of getHexVertexes(centerCoord)) {
        this.occupiedVertexes.set(vertex.hash(), null);
      }
    }

    // https://boardgamegeek.com/image/350486/droberts441
    const numbers = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];

    this.resourceTileStack = shuffleArray(INITIAL_TILES.slice());  // copy + randomize

    let i = 0;
    this.tileMap = new Map();
    for (const coord of HEX_TILE_CENTER_POINTS) {
      const resourceType = this.resourceTileStack.pop(); // this.pickRandomTile();
      const number = resourceType==ResourceTypes.desert ? null : numbers[i++];
      this.tileMap.set(coord.hash(), new Tile(this.drawUtils, coord, resourceType, number));
    }
  }

  isVertex(coord) {
    return this.occupiedVertexes.has(coord.hash());
  }

  isEdgeMidPoint(coord) {
    return this.occupiedEdges.has(coord.hash());
  }

  getVertexesForMidpoint(coord) {
    return this.vertexesByMidpoint.get(coord.hash());
  }

  getAdjacentTileCenters(vertexCoord) {
    return getHexVertexes(vertexCoord)
        .filter(coord => this.tileMap.has(coord.hash()))
        .map(coord => this.tileMap.get(coord.hash()));
  }

  isOccupied(coord) {
    const hash = coord.hash();
    return this.occupiedVertexes.get(hash) || this.occupiedEdges.get(hash);
  }

  occupyVertex(coord, player) {
    this.occupiedVertexes.set(coord.hash(), player);
  }

  occupyEdge(coord, player) {
    this.occupiedEdges.set(coord.hash(), player);
  }

  draw() {
    this.drawUtils.drawBackground();
    this.tileMap.forEach(tile => tile.draw());
  }
}

class Doodler {
  constructor(drawUtils) {
    this.doodleCallbacks = [];
    this.fadingPoints = new Map();
    this.drawUtils = drawUtils;
  }

  addCallback(doodleCallback) {
    this.doodleCallbacks.push(doodleCallback);
  }

  addFadingPoint(coord) {
    const x = Number(coord.x.toFixed(3));
    const y = Number(coord.y.toFixed(3));
    console.log(`Clicked at {x: ${x}, y: ${y}, trueX: ${coord.trueX}, trueY: ${coord.trueY}}`);
    this.fadingPoints.set(coord, Date.now())
  }

  draw() {
    for (const callback of this.doodleCallbacks) {
      callback();
    }

    const now = Date.now();
    this.fadingPoints.forEach((startMs, coord) => {
      const elapsedSeconds = (now - startMs) / 1000;
      const opacity = .8 - elapsedSeconds / 3;
      if (opacity < 0) {
        this.fadingPoints.delete(coord);
        return;
      }
      const color = `rgba(0,0,0,${opacity})`;
      this.drawUtils.drawPoint(coord, 5, color);
    });
  }
}

export {Board, Doodler};
