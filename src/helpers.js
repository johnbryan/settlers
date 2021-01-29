// a hexagon edge is `r` pixels
const r = 58;
const h = r * Math.sqrt(3)/2;

const canvasHeight = 600;
const instructionsHeight = 50;
const waterBackground = new Image();
waterBackground.src = 'images/water-bg-top-half.jpg';

// pts are relative to this position
const boardWaterWidth = 600;
const boardWaterHeight = canvasHeight - instructionsHeight;
const boardX = (boardWaterWidth - 8*h) / 2;  // pixels from left
const boardY = canvasHeight - (boardWaterHeight - 6*r) / 2;  // pixels from top

const xFactor = h;
const yFactor = -r;

const ResourceTypes = {
  brick: 'brick',
  wood: 'wood',
  sheep: 'sheep',
  wheat: 'wheat',
  ore: 'ore',
  desert: 'desert',
}
const ResourceColors = {
  wheat: "#f1e999",
  ore: "lightgray",
  sheep: "lightgreen",
  wood: "forestgreen",
  brick: "#dd7d7d",
  desert: "sandybrown",
}


// these images are all 120 px wide, 177 tall
const cardHeightRatio = 177 / 120;
const cardImages = {
  brick: new Image(),
  wood: new Image(),
  sheep: new Image(),
  wheat: new Image(),
  ore: new Image(),
}
cardImages.brick.src = '../images/brick.jpg';
cardImages.wood.src = '../images/wood.jpg';
cardImages.sheep.src = '../images/sheep.jpg';
cardImages.wheat.src = '../images/wheat.jpg';
cardImages.ore.src = '../images/ore.jpg';


class XyCoord {
  constructor(x, y) {
    // default values assume falseCoords
    this.x = x;
    this.y = y;
    this.trueX = x * xFactor + boardX;
    this.trueY = y * yFactor + boardY;
  }

  static fromTrueCoords(trueX, trueY) {
    const x = (trueX - boardX) / xFactor;
    const y = (trueY - boardY) / yFactor;
    return new XyCoord(x, y);
  }

  snappedToGrid() {
    return new XyCoord(
        Math.round(this.x),
        Math.round(this.y * 2) / 2);
  }

  snappedToMidpointGrid() {
    // nearest multiple of .75
    const y = Math.round(this.y * 4/3) * 3/4;
    // x offsets vary depending on y
    const x = y%1.5 == 0 ? Math.round(this.x) : Math.round(this.x+.5) - .5;
    return new XyCoord(x, y);
  }

  hash() {
    return Math.round(this.trueX)*10000 + Math.round(this.trueY);
  }

  equals(that) {
    return this.x==that.x && this.y==that.y;
  }

  addXY(x, y) {
    return new XyCoord(this.x + x, this.y + y);
  }

  addTrueXY(trueX, trueY) {
    return XyCoord.fromTrueCoords(this.trueX + trueX, this.trueY + trueY);
  }

  isVeryCloseTo(that) {
    const thresholdPx = 15;
    return (this.trueX - that.trueX) ** 2
        + (this.trueY - that.trueY) ** 2
        <= thresholdPx ** 2;
  }

  static averageCoords(coordList) {
    const n = coordList.length;
    const sumX = coordList.reduce((total, coord) => total+coord.x, 0);
    const sumY = coordList.reduce((total, coord) => total+coord.y, 0);
    return new XyCoord(sumX/n, sumY/n);
  }
}

function getHexVertexes(centerCoord) {
  return [
    centerCoord.addXY(-1,  .5),
    centerCoord.addXY( 0,  1),
    centerCoord.addXY( 1,  .5),
    centerCoord.addXY( 1, -.5),
    centerCoord.addXY( 0, -1),
    centerCoord.addXY(-1, -.5),
  ];
}

class DrawUtils {
  ctx;
  constructor(ctx) {
    this.ctx = ctx;
  }

  drawBackground() {
    this.ctx.drawImage(waterBackground, 0, instructionsHeight, boardWaterWidth, boardWaterHeight);
  }

  drawPoint(coord, optRadius, optColor) {
    this.ctx.beginPath();
    this.ctx.arc(coord.trueX, coord.trueY, optRadius || r/20, 0, 2*Math.PI, false);
    this.ctx.strokeStyle = optColor || "black";
    this.ctx.fillStyle = optColor || "black";
    this.ctx.fill();
    this.ctx.stroke();
  }

  // assumes vertexes are not trueCoords
  drawPolygon(vertexes, color, omitStroke) {
    this.ctx.beginPath();
    const lastVertext = vertexes[vertexes.length - 1];
    this.ctx.moveTo(lastVertext.trueX, lastVertext.trueY);
    for (const vertex of vertexes) {
      this.ctx.lineTo(vertex.trueX, vertex.trueY);
    }

    this.ctx.strokeStyle = omitStroke ? color : "black";
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawHex(centerCoord, resourceType) {
    this.drawPolygon(getHexVertexes(centerCoord), ResourceColors[resourceType]);
  }

  // too annoying?
  drawCurrentPlayerColorIcon(color) {
    const x = 24;
    const y = 26;
    const s = Date.now()%1000 / 1000;
    const angle = Math.abs(.5 - s) * 2 - .5;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    this.drawSettlement(XyCoord.fromTrueCoords(0, 0), color);
    this.ctx.restore();
  }

  drawSettlement(centerCoord, color) {
    const vertexes = [
      centerCoord.addXY(-.2, -.15),
      centerCoord.addXY(-.2,  .1),
      centerCoord.addXY(  0,  .25),
      centerCoord.addXY( .2,  .1),
      centerCoord.addXY( .2, -.15)
    ];

    this.drawPolygon(vertexes, color);
  }

  drawCity(centerCoord, color) {
    const vertexes = [
      centerCoord.addXY(-.3, -.15),
      centerCoord.addXY(-.3,  .1),
      centerCoord.addXY(-.1,  .1),
      centerCoord.addXY( .05, .25),
      centerCoord.addXY( .2,  .1),
      centerCoord.addXY( .2, -.15)
    ];

    this.drawPolygon(vertexes, color);
  }

  drawRoad(coord1, coord2, color) {
    const diffX = coord2.x - coord1.x;
    const diffY = coord2.y - coord1.y;

    const start = coord1.addXY(diffX / 6, diffY / 6);
    const end = coord2.addXY(-diffX / 6, -diffY / 6);

    this.ctx.beginPath();
    this.ctx.moveTo(start.trueX, start.trueY);
    this.ctx.lineTo(end.trueX, end.trueY);

    this.ctx.lineWidth = 10;
    this.ctx.strokeStyle = color;
    this.ctx.stroke();

    // reset so future lines aren't messed up
    this.ctx.lineWidth = 1;
  }

  drawNumberTile(centerCoord, number) {
    // white circle for background/contrast
    this.ctx.beginPath();
    this.ctx.arc(centerCoord.trueX, centerCoord.trueY, 20, 0, 2*Math.PI, false);
    this.ctx.strokeStyle = "white";
    this.ctx.fillStyle = "white";
    this.ctx.fill();
    this.ctx.stroke();

    // the number
    this.ctx.font = "30px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    const numberOffset = [10,12].includes(number) ? 2 : 0;  // e.g. "12" has a wider 2 than 1
    this.ctx.fillText(number, centerCoord.trueX - numberOffset, centerCoord.trueY + 5);

    // the probability dots
    const dotCount = 6 - Math.abs(7-number);
    const radius = 2;
    const distBetween = 3 * radius;
    const maxOffset = (dotCount - 1) * distBetween / 2;
    for (let i=0; i<dotCount; i++) {
      const xOffset = maxOffset - i * distBetween;
      this.drawPoint(centerCoord.addTrueXY(xOffset, 12), radius);
    }
  }

  drawInstructions(text) {
    this.ctx.font = "30px Arial";
    if (text.length > 55) this.ctx.font = "24px Arial";
    if (text.length > 70) this.ctx.font = "18px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "left";
    this.ctx.fillText(text, 48, 35);
  }

  // takes resources object of {type: count}
  drawResourceCardImages(resources) {
    if (resources.brick < 0
        || resources.wood < 0
        || resources.sheep < 0
        || resources.wheat < 0
        || resources.ore < 0) {
      console.error('Negative resource counts!!!');
      console.error(resources);
    }

    const list = [];
    for (let i=0; i<resources.brick; i++) {
      list.push(cardImages.brick);
    }
    for (let i=0; i<resources.wood; i++) {
      list.push(cardImages.wood);
    }
    for (let i=0; i<resources.sheep; i++) {
      list.push(cardImages.sheep);
    }
    for (let i=0; i<resources.wheat; i++) {
      list.push(cardImages.wheat);
    }
    for (let i=0; i<resources.ore; i++) {
      list.push(cardImages.ore);
    }

    const startX = 620;
    const startY = 50;

    let cardWidth = 120;
    let dx = 35;
    let dy = 14;
    if (list.length >= 8) {
      cardWidth = 90;
      dx = 25;
    }
    if (list.length >= 14) {
      cardWidth = 60;
      dx = 15;
    }

    for (let i=0; i<list.length; i++) {
      const x = startX + i*dx;
      const y = startY + (i%2)*dy;
      this.ctx.drawImage(list[i], x, y, cardWidth, cardWidth * cardHeightRatio);
    }
  }

  drawDevCardImages(unused, used) {
    // unused ones first
    let startX = 620;
    let startY = 250;

    let cardWidth = 120;
    let dx = 124;
    let dy = 0;
    if (unused.length >= 4) {
      dx = 62;
      dy = 30;
    }
    if (unused.length >= 6) {
      cardWidth = 90;
      dx = 90;
      dy = 24;
    }
    for (let i=0; i<unused.length; i++) {
      const x = startX + i*dx;
      const y = startY + (i%2)*dy;
      this.ctx.drawImage(unused[i].getImage(), x, y, cardWidth, cardWidth * cardHeightRatio);
    }

    // used ones
    startX = 720;
    startY = 450;

    cardWidth = 60;
    dx = cardWidth + 5;
    for (let i=0; i<used.length; i++) {
      const x = startX + i*dx;
      this.ctx.drawImage(used[i].getImage(), x, startY, cardWidth, cardWidth * cardHeightRatio);
    }
  }

  drawCardImages(list, startX, startY) {
    let cardWidth = 120;
    let dx = 35;
    let dy = 14;
    if (list.length >= 8) {
      cardWidth = 90;
      dx = 25;
      // dy = 10;
    }
    if (list.length >= 14) {
      cardWidth = 60;
      dx = 15;
      // dy = 6;
    }

    for (let i=0; i<list.length; i++) {
      const x = startX + i*dx;
      const y = startY + (i%2)*dy;
      this.ctx.drawImage(list[i], x, y, cardWidth, cardWidth * cardHeightRatio);
    }
  }

  drawVictoryPoints(number) {
    const vertexes = [
      XyCoord.fromTrueCoords(655, 460),
      XyCoord.fromTrueCoords(685, 550),
      XyCoord.fromTrueCoords(610, 490),
      XyCoord.fromTrueCoords(700, 490),
      XyCoord.fromTrueCoords(625, 550),
    ];
    this.drawPolygon(vertexes, "yellow", true);

    // the number
    this.ctx.font = "30px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    this.ctx.fillText(number, 655, 518);
  }
}

export { XyCoord, DrawUtils, getHexVertexes, ResourceTypes };
