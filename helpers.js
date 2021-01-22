const deg15 = Math.PI / 12;
const deg30 = Math.PI / 6;
const deg60 = Math.PI / 3;

const r = 60;
const h = r * Math.sqrt(3)/2;

// pts are relative to this position
const boardX = 100;  // pixels from left
const boardY = 480;  // pixels from bottom

const xFactor = h;
const yFactor = -r;
// const thetaFactor = Math.PI/6;

const WHEAT = "#f1e999";  // #f3e7a9
const ORE = "lightgray";
const SHEEP = "lightgreen";
const WOOD = "forestgreen";
const BRICK = "#dd7d7d";
const DESERT = "sandybrown";
// const resourceColors = {
//   WHEAT = "#f1e999",
//   ORE = "lightgray",
//   SHEEP = "lightgreen",
//   WOOD = "forestgreen",
//   BRICK = "#dd7d7d",
//   DESERT = "sandybrown",
// }


// these images are all 120 wide, 177 tall
const cardHeightRatio = 177 / 120;
const cardImages = {
  brick: new Image(),
  wood: new Image(),
  sheep: new Image(),
  wheat: new Image(),
  ore: new Image(),
}
cardImages.brick.src = 'images/brick.jpg';
cardImages.wood.src = 'images/wood.jpg';
cardImages.sheep.src = 'images/sheep.jpg';
cardImages.wheat.src = 'images/wheat.jpg';
cardImages.ore.src = 'images/ore.jpg';


class xyCoord {
  constructor(x, y, snapToGrid) {
    // default values assume falseCoords
    this.x = x;
    this.y = y;
    this.trueX = x * xFactor + boardX;
    this.trueY = y * yFactor + boardY;

    if (snapToGrid) {
      this.snapToGrid();
    }
  }

  static fromTrueCoords(trueX, trueY, snapToGrid) {
    const x = (trueX - boardX) / xFactor;
    const y = (trueY - boardY) / yFactor;
    return new xyCoord(x, y, snapToGrid);
  }

  snapToGrid() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y * 2) / 2;
    this.trueX = this.x * xFactor + boardX;
    this.trueY = this.y * yFactor + boardY;
  }

  snappedToGrid() {
    return new xyCoord(
        Math.round(this.x),
        Math.round(this.y * 2) / 2);
  }

  snappedToMidpointGrid() {
    // nearest multiple of .75
    const y = Math.round(this.y * 4/3) * 3/4;
    // x offsets vary depending on y
    const x = y%1.5 == 0 ? Math.round(this.x) : Math.round(this.x+.5) - .5;
    return new xyCoord(x, y);
  }

  hash() {
    return Math.round(this.trueX)*10000 + Math.round(this.trueY);
  }

  static unhash(ptHash) {
    return fromTrueCoords(Math.floor(ptHash/10000), ptHash%10000);
  }

  equals(that) {
    return this.x==that.x && this.y==that.y;
  }

  addXY(x, y) {
    return new xyCoord(this.x + x, this.y + y);
  }
  
  addTrueXY(trueX, trueY) {
    return xyCoord.fromTrueCoords(this.trueX + trueX, this.trueY + trueY);
  }

  isVeryCloseTo(that) {
    const veryClosePx = 15;
    return (this.trueX - that.trueX) ** 2 
        + (this.trueY - that.trueY) ** 2
        <= veryClosePx ** 2;
  }

  static averageCoords(coordList) {
    const n = coordList.length;
    const sumX = coordList.reduce((total, coord) => total+coord.x, 0);
    const sumY = coordList.reduce((total, coord) => total+coord.y, 0);
    return new xyCoord(sumX/n, sumY/n);
  }
}

function drawPoint(ctx, coord, optRadius, optColor) {
  if (!ctx) return;

  ctx.beginPath();
  ctx.arc(coord.trueX, coord.trueY, optRadius || r/20, 0, 2*Math.PI, false);
  ctx.strokeStyle = optColor || "black";
  ctx.fillStyle = optColor || "black";
  ctx.fill();
  ctx.stroke();
}

// assumes vertexes are not trueCoords
function drawPolygon(ctx, vertexes, color, omitStroke) {
  if (!ctx) return;

  ctx.beginPath();
  const lastVertext = vertexes[vertexes.length - 1];
  ctx.moveTo(lastVertext.trueX, lastVertext.trueY);
  for (const vertex of vertexes) {
    ctx.lineTo(vertex.trueX, vertex.trueY);
  }

  ctx.strokeStyle = omitStroke ? color : "black";
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
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

function drawHex(ctx, centerCoord, color) {
  if (!ctx) return;
  drawPolygon(ctx, getHexVertexes(centerCoord), color);
}

function drawSettlement(ctx, centerCoord, color) {
  if (!ctx) return;

  const vertexes = [
    centerCoord.addXY(-.2, -.15),
    centerCoord.addXY(-.2,  .1),
    centerCoord.addXY(  0,  .25),
    centerCoord.addXY( .2,  .1),
    centerCoord.addXY( .2, -.15)
  ];

  drawPolygon(ctx, vertexes, color);
}

function drawCity(ctx, centerCoord, color) {
  if (!ctx) return;

  const vertexes = [
    centerCoord.addXY(-.3, -.15),
    centerCoord.addXY(-.3,  .1),
    centerCoord.addXY(-.1,  .1),
    centerCoord.addXY( .05, .25),
    centerCoord.addXY( .2,  .1),
    centerCoord.addXY( .2, -.15)
  ];

  drawPolygon(ctx, vertexes, color);
}

function drawRoad(ctx, coord1, coord2, color) {
  if (!ctx) return;

  const diffX = coord2.x - coord1.x;
  const diffY = coord2.y - coord1.y;

  const start = coord1.addXY(diffX / 6, diffY / 6);
  const end = coord2.addXY(-diffX / 6, -diffY / 6);

  ctx.beginPath();
  ctx.moveTo(start.trueX, start.trueY);
  ctx.lineTo(end.trueX, end.trueY);

  ctx.lineWidth = 10;
  ctx.strokeStyle = color;
  ctx.stroke();

  // reset so future lines aren't messed up
  ctx.lineWidth = 1;
}

function drawNumberTile(ctx, centerCoord, number) {
  // white circle for background/contrast
  ctx.beginPath();
  ctx.arc(centerCoord.trueX, centerCoord.trueY, 20, 0, 2*Math.PI, false);
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.stroke();

  // the number
  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  const numberOffset = [10,12].includes(number) ? 2 : 0;  // e.g. 12 has a wider 2 than 1
  ctx.fillText(number, centerCoord.trueX - numberOffset, centerCoord.trueY + 5);

  // the probability dots
  const dotCount = 6 - Math.abs(7-number);
  const radius = 2;
  const distBetween = 3 * radius;
  const maxOffset = (dotCount - 1) * distBetween / 2;
  for (let i=0; i<dotCount; i++) {
    const xOffset = maxOffset - i * distBetween;
    drawPoint(ctx, centerCoord.addTrueXY(xOffset, 12), radius);
  }
}

function drawInstructions(text) {
  ctx.font = "30px Arial";
  if (text.length > 55) ctx.font = "24px Arial";
  if (text.length > 70) ctx.font = "18px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.fillText(text, 48, 32);
}

// takes resources object of {type: count}
function drawResourceCardImages(resources) {
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
    ctx.drawImage(list[i], x, y, cardWidth, cardWidth * cardHeightRatio);
  }
}

function drawDevCardImages(unused, used) {
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
    ctx.drawImage(unused[i].getImage(), x, y, cardWidth, cardWidth * cardHeightRatio);
  }

  // used ones
  startX = 720;
  startY = 450;
  
  cardWidth = 60;
  dx = cardWidth + 5;
  for (let i=0; i<used.length; i++) {
    const x = startX + i*dx;
    ctx.drawImage(used[i].getImage(), x, startY, cardWidth, cardWidth * cardHeightRatio);
  }
}

function drawCardImages(list, startX, startY) {
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
    ctx.drawImage(list[i], x, y, cardWidth, cardWidth * cardHeightRatio);
  }
}

function drawCard_deprecated(ctx, topLeftCoord, color) {
  const vertexes = [
    topLeftCoord,
    topLeftCoord.addTrueXY(0, 100),
    topLeftCoord.addTrueXY(60, 100),
    topLeftCoord.addTrueXY(60, 0),
  ];
  drawPolygon(ctx, vertexes, color);
}

function drawVictoryPoints(number) {
  const vertexes = [
    xyCoord.fromTrueCoords(655, 460),
    xyCoord.fromTrueCoords(685, 550),
    xyCoord.fromTrueCoords(610, 490),
    xyCoord.fromTrueCoords(700, 490),
    xyCoord.fromTrueCoords(625, 550),
  ];
  drawPolygon(ctx, vertexes, "yellow", true);

  // the number
  ctx.font = "30px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.fillText(number, 655, 518);
}

// export {xyCoord, drawPoint, drawHex, drawSettlement};