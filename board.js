var waterBackground = new Image();
waterBackground.src = 'images/water-cropped.jpg';

class Tile {
  // number is dice number
  constructor(coord, resource, number) {
    this.resource = resource;
    this.number = number;
    this.coord = coord;

    this.hasRobber = false;
  }

  getResourceName() {
    switch (this.resource) {
      case WHEAT: return "wheat";
      case ORE: return "ore";
      case SHEEP: return "sheep";
      case WOOD: return "wood";
      case BRICK: return "brick";
      default: return undefined;
    }
  }

  draw() {
    drawHex(ctx, this.coord, this.resource);
    if (this.number) {
      drawNumberTile(ctx, this.coord, this.number);
    }
  }
}

class Board {
  constructor() {
    const coords = [
      new xyCoord(2, 0),
      new xyCoord(1, 1.5),
      new xyCoord(0, 3),
      new xyCoord(1, 4.5),
      new xyCoord(2, 6),
      new xyCoord(4, 6),
      new xyCoord(6, 6),
      new xyCoord(7, 4.5),
      new xyCoord(8, 3),
      new xyCoord(7, 1.5),
      new xyCoord(6, 0),
      new xyCoord(4, 0),
      new xyCoord(3, 1.5),
      new xyCoord(2, 3),
      new xyCoord(3, 4.5),
      new xyCoord(5, 4.5),
      new xyCoord(6, 3),
      new xyCoord(5, 1.5),
      new xyCoord(4, 3),
    ];

    this.vertexHashes = new Set();
    this.midPointHashes = new Set();
    this.vertexesByMidpoint = new Map();  // Map<hash, [pt1, pt2]>
    for (const coord of coords) {
      const vertexes = getHexVertexes(coord);
      for (let i=0; i<5; i++) {
        const hash = xyCoord.averageCoords([vertexes[i], vertexes[i+1]]).hash();
        this.midPointHashes.add(hash);
        this.vertexesByMidpoint.set(hash, [vertexes[i], vertexes[i+1]]);
      }
      const hash = xyCoord.averageCoords([vertexes[5], vertexes[0]]).hash();
      this.midPointHashes.add(hash);
      this.vertexesByMidpoint.set(hash, [vertexes[5], vertexes[0]]);

      for (const vertex of getHexVertexes(coord)) {
        this.vertexHashes.add(vertex.hash());
      }
    }

    // https://boardgamegeek.com/image/350486/droberts441
    const numbers = [5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];

    this.unplacedTileCounts = new Map([
      [WHEAT, 4],
      [ORE, 3],
      [SHEEP, 4],
      [WOOD, 4],
      [BRICK, 3],
      [DESERT, 1],
    ]);
    
    let i = 0;
    this.tileMap = new Map();
    for (const coord of coords) {
      const resourceTile = this.pickRandomTile();
      const number = resourceTile==DESERT ? null : numbers[i++];
      this.tileMap.set(coord.hash(), new Tile(coord, resourceTile, number));
    }
  }

  isVertex(coord) {
    return this.vertexHashes.has(coord.hash());
  }

  isEdgeMidPoint(coord) {
    // return this.midPointHashes.has(coord.hash());
    return this.vertexesByMidpoint.has(coord.hash());
  }

  getVertexesForMidpoint(coord) {
    return this.vertexesByMidpoint.get(coord.hash());
  }

  pickRandomTile() {
    const counts = Array.from(this.unplacedTileCounts.values());
    const totalLeft = counts.reduce((total, each) => total+each, 0);
    const randIndex = Math.floor(Math.random() * totalLeft);
    let seen = 0;
    for (const [type, count] of this.unplacedTileCounts) {
      if (seen + count > randIndex) {
        this.unplacedTileCounts.set(type, count - 1);
        return type;
      }
      seen += count;
    }
    console.error("oops! " + this.unplacedTileCounts);
  }

  getAdjacentTiles(vertexCoord) {
    return getHexVertexes(vertexCoord)
        .filter(coord => this.tileMap.has(coord.hash()))
        .map(coord => this.tileMap.get(coord.hash()));
  }

  // getTilesForDiceRoll(number) {
  //   return this.tileMap.values().filter(tile => tile.number==number);
  // }

  draw() {
    ctx.drawImage(waterBackground, 0, 50, 600, 550);
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
      drawPoint(ctx, coord, 5, color);
    });
  }
}