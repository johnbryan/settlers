import {XyCoord, getHexVertexes, ResourceTypes} from './helpers.js';
import {DrawUtils} from './helpers.js';
import {NUMBER_TILES, getShuffledResourceTiles} from './settlersConstants.js';

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

class Tile {
  // number is dice number
  constructor(coord, resource, number) {
    this.resource = resource;
    this.number = number;
    this.coord = coord;
  }

  getResourceName() {
    return this.resource;
  }

  draw() {
    DrawUtils.drawHex(this.coord, this.resource);
    if (this.number) {
      DrawUtils.drawNumberTile(this.coord, this.number);
    }
  }
}

class Board {
  constructor() {
    this.allHashCoords = new Map();  // Map<ptHash, XyCoord>
    this.occupiedVertexes = new Map();  // Map<ptHash, playerIndex>
    this.occupiedEdges = new Map();  // Map<ptHash, playerIndex>
    this.vertexesByMidpoint = new Map();  // Map<ptHash, [pt1, pt2]>
    for (const centerCoord of HEX_TILE_CENTER_POINTS) {
      const vertexes = getHexVertexes(centerCoord);
      for (let i=0; i<5; i++) {
        const midpoint = XyCoord.averageCoords([vertexes[i], vertexes[i+1]]);
        const hash = midpoint.hash();
        this.allHashCoords.set(hash, midpoint);
        this.occupiedEdges.set(hash, null);
        this.vertexesByMidpoint.set(hash, [vertexes[i], vertexes[i+1]]);
      }
      const midpoint = XyCoord.averageCoords([vertexes[5], vertexes[0]]);
      const hash = midpoint.hash();
      this.allHashCoords.set(hash, midpoint);
      this.occupiedEdges.set(hash, null);
      this.vertexesByMidpoint.set(hash, [vertexes[5], vertexes[0]]);

      for (const vertex of getHexVertexes(centerCoord)) {
        this.allHashCoords.set(vertex.hash(), vertex);
        this.occupiedVertexes.set(vertex.hash(), null);
      }
    }

    this.resourceTileStack = getShuffledResourceTiles();
    this.tileResources = this.resourceTileStack.slice();

    let i = 0;
    this.tileMap = new Map();  // Map<ptHash, Tile>
    for (const coord of HEX_TILE_CENTER_POINTS) {
      const resourceType = this.resourceTileStack.pop();
      const number = resourceType==ResourceTypes.desert ? null : NUMBER_TILES[i++];  // only increment 'i' if not a desert
      this.tileMap.set(coord.hash(), new Tile(coord, resourceType, number));
    }
  }

  setState(state) {
    if (state.tileResources) {
      for (const tile of state.tileResources) {
        const coordHash = new XyCoord(tile.coord.x, tile.coord.y).hash();
        this.tileMap.get(coordHash).resource = tile.resource;
        this.tileMap.get(coordHash).number = tile.number;
      }
    }
    if (state.occupiedVertexes) {
      for (let i=0; i<state.occupiedVertexes.length; i++) {
        const [hash, playerIndex] = state.occupiedVertexes[i];
        this.occupiedVertexes.set(hash, playerIndex);
      }
    }
    if (state.occupiedEdges) {
      this.occupiedEdges = new Map(state.occupiedEdges);
    }
  }

  getState() {
    const tiles = Array.from(this.tileMap.values());

    return {
      tileResources: tiles.map(tile => {
        const {coord, resource, number} = tile;
        return {coord, resource, number};
      }),
      occupiedVertexes: Array.from(this.occupiedVertexes.entries()),
      occupiedEdges: Array.from(this.occupiedEdges.entries()),
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
    return this.occupiedVertexes.get(hash) != null
        || this.occupiedEdges.get(hash) != null;
  }

  getOccupantIndex(coord) {
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
    DrawUtils.drawBackground();
    this.tileMap.forEach(tile => tile.draw());
  }
}

class Doodler {
  constructor() {
    this.doodleCallbacks = [];
    this.fadingPoints = new Map();
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
      DrawUtils.drawPoint(coord, 5, color);
    });
  }
}

export {Board, Doodler};
