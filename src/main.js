import {XyCoord, DrawUtils} from './helpers.js';
import {DevCard} from './devcards.js';
import {Board, Doodler} from './board.js';

const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');
const drawUtils = new DrawUtils(ctx);

let debug = false;

const ACT_INSTRUCTION = `Take your next action (s,c,r,d,t), or Enter to pass`;
const RESOURCE_CHOICE_NUMBERS = '1=brick, 2=wood, 3=sheep, 4=wheat, 5=ore';

const structureTypes = {
  settlement: 'settlement',
  city: 'city',
  road: 'road',
  devCard: 'devCard',
}

function getCosts(type) {
  if (type == structureTypes.settlement) {
    return {
      brick: 1,
      wood: 1,
      sheep: 1,
      wheat: 1,
      ore: 0,
    }
  }
  if (type == structureTypes.city) {
    return {
      brick: 0,
      wood: 0,
      sheep: 0,
      wheat: 2,
      ore: 3,
    }
  }
  if (type == structureTypes.road) {
    return {
      brick: 1,
      wood: 1,
      sheep: 0,
      wheat: 0,
      ore: 0,
    }
  }
  if (type == structureTypes.devCard) {
    return {
      brick: 0,
      wood: 0,
      sheep: 1,
      wheat: 1,
      ore: 1,
    }
  }
}

// necessary? or could just have settlement/city lists under player
class Building {
  constructor(owner, coord) {
    this.owner = owner;
    this.coord = coord;
    this.isCity = false;
  }

  draw() {
    if (this.isCity) {
      drawUtils.drawCity(this.coord, this.owner.color);
    }
    else {
      drawUtils.drawSettlement(this.coord, this.owner.color);
    }
  }
}

class Player {
  constructor(game, name, color) {
    this.game = game;
    this.name = name;
    this.color = color;
    this.buildings = [];
    this.roads = [];  // list of [pt1, pt2] pairs?

    // Start with what is needed for initial placement. This is hidden from the
    // players until initial placement is done.
    this.resources = {
      brick: 4,
      wood: 4,
      sheep: 2,
      wheat: 2,
      ore: 0,
    }

    this.devCardsUnused = [];
    this.devCardsUsed = [];
  }

  addResource(resource, quantity) {
    if (!quantity) quantity=1;
    this.resources[resource] += quantity;

    if (debug) {
      console.log(`${this.name} has resources:`);
      console.log(this.resources);
    }
  }

  addResourceList(resources) {
    for (const resource of resources) {
      this.addResource(resource, 1);
    }
  }

  getVictoryPoints() {
    const buildingPoints =
        this.buildings
            .map(b => b.isCity ? 2 : 1)
            .reduce((total, pts) => total + pts, 0);

    const longestRoadPoints = 0;
    const largestArmyPoints = 0;
    const pointCards = this.devCardsUsed.map(c => c.pointValue).reduce((total, pts) => total + pts, 0);

    return buildingPoints + longestRoadPoints + largestArmyPoints + pointCards;
  }

  canBuild(structureType) {
    const needed = getCosts(structureType);
    return this.resources.brick >= needed.brick
        && this.resources.wood >= needed.wood
        && this.resources.sheep >= needed.sheep
        && this.resources.wheat >= needed.wheat
        && this.resources.ore >= needed.ore;
  }

  deductResources(structureType) {
    const costs = getCosts(structureType);

    this.resources.brick -= costs.brick;
    this.resources.wood -= costs.wood;
    this.resources.sheep -= costs.sheep;
    this.resources.wheat -= costs.wheat;
    this.resources.ore -= costs.ore;
  }

  buildSettlement(coord) {
    if (this.game.board.isOccupied(coord)) {
      console.log('This spot already taken!');
      return false;
    }

    this.deductResources(structureTypes.settlement);
    this.buildings.push(new Building(this, coord));
    this.game.board.occupyVertex(coord, this);
    return true;
  }

  // return false if coord is not a settlement
  buildCity(coord) {
    for (const building of this.buildings) {
      if (building.coord.equals(coord)) {
        if (building.isCity) {
          console.log('Already a city!');
          return false;
        }

        this.deductResources(structureTypes.city);
        building.isCity = true;
        return true;
      }
    }
    console.log('no settlement here, can\'t build a city.')
    return false;
  }

  buildRoad(coord1, coord2) {
    const midpoint = XyCoord.averageCoords([coord1, coord2]);
    if (this.game.board.isOccupied(midpoint)) {
      console.log('This spot already taken!');
      return false;
    }

    this.deductResources(structureTypes.road);
    this.roads.push([coord1, coord2]);
    this.game.board.occupyEdge(midpoint, this);
    return true;

    // update longest road?
  }

  buyDevCard() {
    const card = new DevCard(this.game);
    const list = card.isUsable ? this.devCardsUnused : this.devCardsUsed;
    list.push(card);
    this.deductResources(structureTypes.devCard);
  }

  drawRoads() {
    this.roads.forEach(([pt1, pt2]) => drawUtils.drawRoad(pt1, pt2, this.color));
  }

  drawBuildings() {
    this.buildings.forEach(b => b.draw());
  }
}

class Game {
  constructor() {
    this.board = new Board(drawUtils);

    this.players = [
      new Player(this, "Dena", "red"),
      new Player(this, "John", "white"),
      // new Player(this, "Bob", "blue"),
    ];

    this.whoseTurn = 0;  // index in this.players

    this.instructions = "";

    this.phases = {
      initialPlacement: 'initialPlacement',
      rolling: 'rolling',
      acting: 'acting',
      building: 'building',
      trading: 'trading',
      robber: 'robber',
      pickResources: 'pickResources',  // for trades, YOP, etc
    }

    // keep at end
    this.startInitialPlacements();
  }

  currentPlayer() {
    return this.players[this.whoseTurn];
  }

  // ensures each instruction is shown for a minimum time period
  setInstructions(newInstructions) {
    this.instructions = newInstructions;
  }

  startInitialPlacements() {
    this.setInstructions(`place your first settlement`);
    this.phase = this.phases.initialPlacement;
  }

  startRobberPhase(instructionsPrefix) {
    this.setInstructions(instructionsPrefix + ' Robber is out at sea; pick a resource instead!');
    this.phase = this.phases.robber;

    this.startPickResourcesPhase(1);
  }

  // when user decides to build a settlement, road, or city on a normal turn
  startBuildPhase(structureType) {
    if (!this.currentPlayer().canBuild(structureType)) {
      console.log('no can do\'sville, babydoll!');
      this.phase = this.phases.acting;
      this.setInstructions(ACT_INSTRUCTION);
      return;
    }
    if (structureType == structureTypes.devCard) {
      this.currentPlayer().buyDevCard();
    }
    else {
      this.setInstructions(`click to place your ${structureType}`);
      this.phase = this.phases.building;
      this.trynaBuildType = structureType;
    }
  }

  startTradingPhase() {
    console.log(`Trading currently just supports 3-1 with bank`);
    const resources = this.currentPlayer().resources;
    if (resources.brick < 3
        && resources.wood < 3
        && resources.sheep < 3
        && resources.wheat < 3
        && resources.ore < 3) {
      console.log('You need three of something to trade!');
      return;
    }

    this.phase = this.phases.trading;
    this.setInstructions(`What do you want to trade in? ${RESOURCE_CHOICE_NUMBERS}`);
  }

  handleTradeInChoice(number) {
    const resourceChoices = ["", "brick", "wood", "sheep", "wheat", "ore"];
    const selected = resourceChoices[number];

    const currentCount = this.currentPlayer().resources[selected];
    if (currentCount < 3) {
      console.log('You need three of something to trade!');
      return;
    }

    this.currentPlayer().resources[selected] -= 3;
    this.setInstructions(`Traded in 3 ${selected}. What do you want in return?`);
    this.startPickResourcesPhase(1);
  }

  startPickResourcesPhase(numCards) {
    this.phase = this.phases.pickResources;
    this.setInstructions(`${this.instructions} ${RESOURCE_CHOICE_NUMBERS}`);
    this.numCardsToDraw = numCards;
  }

  handleResourceChoice(number) {
    const resources = ["", "brick", "wood", "sheep", "wheat", "ore"];
    this.currentPlayer().addResource(resources[number]);
    this.numCardsToDraw--;

    const summary = `you selected ${resources[number]}. `;
    if (this.numCardsToDraw > 0) {
      this.setInstructions(summary + `Select ${this.numCardsToDraw} more!`);
      this.startPickResourcesPhase(this.numCardsToDraw);
    }
    else {
      this.phase = this.phases.acting;
      this.setInstructions(summary + ACT_INSTRUCTION);
    }
  }

  handleSetupClick(coord) {
    // if time for a settlement
    if (this.currentPlayer().buildings.length == this.currentPlayer().roads.length) {
      const snappedCoord = coord.snappedToGrid();
      if (!this.board.isVertex(snappedCoord)
          || !snappedCoord.isVeryCloseTo(coord)) {
        console.log("did not click a vertex, doing nothing.");
        return;
      }

      const success = this.currentPlayer().buildSettlement(snappedCoord);
      if (!success) return;

      if (this.currentPlayer().getVictoryPoints() >= 2) {
        const tiles = this.board.getAdjacentTileCenters(snappedCoord);
        this.currentPlayer().addResourceList(tiles.map(t => t.getResourceName()));
      }

      this.setInstructions(`place your road`);
    }

    // if time for a road
    else {
      const snappedToMid = coord.snappedToMidpointGrid();
      if (!this.board.isEdgeMidPoint(snappedToMid)
          || !snappedToMid.isVeryCloseTo(coord)) {
        console.log("did not click an edge, doing nothing.");
        return;
      }

      const endsOfRoad = this.board.getVertexesForMidpoint(snappedToMid);
      const success = this.currentPlayer().buildRoad(endsOfRoad[0], endsOfRoad[1]);
      if (!success) return;

      if (this.players[0].getVictoryPoints() >= 2) {
        // done with setup phase
        this.rollDice();
      }
      else if (this.currentPlayer().getVictoryPoints() >= 2) {
        this.whoseTurn--;
        this.setInstructions(`place your second settlement`);
      }
      else if (this.whoseTurn == this.players.length - 1) {
        this.setInstructions(`place your second settlement`);
      }
      else {
        this.whoseTurn++;
        this.setInstructions(`place your first settlement`);
      }
    }
  }

  handleBuildClick(coord) {
    let success = false;
    if (this.trynaBuildType == structureTypes.settlement) {
      const snappedCoord = coord.snappedToGrid();
      if (!this.board.isVertex(snappedCoord)
          || !snappedCoord.isVeryCloseTo(coord)) {
        console.log("did not click a vertex, doing nothing.");
        return;
      }

      success = this.currentPlayer().buildSettlement(snappedCoord);
    }
    else if (this.trynaBuildType == structureTypes.city) {
      const snappedCoord = coord.snappedToGrid();
      if (!this.board.isVertex(snappedCoord)
          || !snappedCoord.isVeryCloseTo(coord)) {
        console.log("did not click a vertex, doing nothing.");
        return;
      }

      success = this.currentPlayer().buildCity(snappedCoord);
    }
    else if (this.trynaBuildType == structureTypes.road) {
      const snappedToMid = coord.snappedToMidpointGrid();
      if (!this.board.isEdgeMidPoint(snappedToMid)
          || !snappedToMid.isVeryCloseTo(coord)) {
        console.log("did not click an edge, doing nothing.");
        return;
      }

      success = this.currentPlayer().buildRoad(...this.board.getVertexesForMidpoint(snappedToMid));
    }

    if (success) {
      this.phase = this.phases.acting;
      this.setInstructions(ACT_INSTRUCTION);
    }
  }

  handleActionClick(coord) {
    console.log('action clicks not supported yet');
  }

  handleClick(coord) {
    const snappedCoord = coord.snappedToGrid();
    const snappedToMid = coord.snappedToMidpointGrid();

    switch (this.phase) {
      case this.phases.initialPlacement:
        this.handleSetupClick(coord);
        break;
      case this.phases.acting:
        this.handleActionClick(coord);
        break;
      case this.phases.building:
        this.handleBuildClick(coord);
        break;
      default:
        console.log(`Clicked during ${this.phase} phase, doing nothing`);
    }
  }

  nextPlayerTurn() {
    if (this.whoseTurn == this.players.length - 1) {
      this.whoseTurn = 0;
    }
    else this.whoseTurn++;
    this.rollDice();
  }

  // number is optional, usually blank
  rollDice(number) {
    this.phase = this.phases.rolling;

    if (!number) {
      const roll1 = Math.floor(Math.random() * 6 + 1);
      const roll2 = Math.floor(Math.random() * 6 + 1);
      number = roll1 + roll2;
    }

    if (number == 7) {
      this.startRobberPhase('you rolled a 7!');
    }
    else {
      this.setInstructions(`you rolled: ${number}. ` + ACT_INSTRUCTION);
      this.collectResources(number);
      this.phase = this.phases.acting;
    }
  }

  collectResources(number) {
    for (const player of this.players) {
      for (const building of player.buildings) {
        // find adj tiles, filter to number, collect 1 or 2
        const relevantTiles = this.board.getAdjacentTileCenters(building.coord).filter(tile => tile.number==number);
        for (const tile of relevantTiles) {
          player.addResource(tile.getResourceName(), building.isCity ? 2 : 1);
        }
      }
    }
  }

  useDevCard(numberInput) {
    const index = numberInput - 1;
    const totalUnused = game.currentPlayer().devCardsUnused.length;

    if (index < totalUnused) {
      const target = this.currentPlayer().devCardsUnused[index];
      target.use();

      const left = this.currentPlayer().devCardsUnused.slice(0, index);
      const right = this.currentPlayer().devCardsUnused.slice(index+1, totalUnused);
      this.currentPlayer().devCardsUnused = left.concat(right);
      this.currentPlayer().devCardsUsed.push(target);
    }
    else {
      console.log(`${numberInput} not an unplayed dev card?`);
    }
  }

  draw() {
    // Must be in order - things drawn second will be layered on top
    this.board.draw();
    this.players.forEach(p => p.drawRoads());
    this.players.forEach(p => p.drawBuildings());

    const player = this.currentPlayer();
    drawUtils.drawCurrentPlayerColorIcon(player.color);
    drawUtils.drawInstructions(`${player.name}, ${this.instructions}!`);

    if (this.phase != this.phases.initialPlacement) {
      drawUtils.drawResourceCardImages(player.resources);
      drawUtils.drawDevCardImages(player.devCardsUnused, player.devCardsUsed);
      drawUtils.drawVictoryPoints(player.getVictoryPoints());
    }
  }
}

const doodler = new Doodler(drawUtils);
const game = new Game();

function onClick(event) {
  const mouseX = event.pageX - canvas.offsetLeft;
  const mouseY = event.pageY - canvas.offsetTop;
  const rawCoord = XyCoord.fromTrueCoords(mouseX, mouseY);

  game.handleClick(rawCoord);

  if (debug) {
    doodler.addFadingPoint(rawCoord);
  }
}

canvas.addEventListener('click', onClick, false);

setInterval(draw, 50);

function draw() {
  if (!drawUtils) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  game.draw();

  if (debug) {
    doodler.draw();

    // Show grid
    // for (let x=0; x<9; x++) {
    //   for (let y=0; y<7; y++) {
    //     drawPoint(ctx, new XyCoord(x, y));
    //   }
    // }

    // Show midpoint grid
    for (let x=0; x<8; x+=.1) {
      for (let y=0; y<7; y+=.1) {
        drawUtils.drawPoint(ctx, new XyCoord(x, y).snappedToMidpointGrid());
      }
    }
  }
}

// Handles digits 0-9, depending on current game phase
function handleNumberInput(n) {
  if (game.phase == game.phases.pickResources && 1 <= n && n <= 5) {
    game.handleResourceChoice(n);
  }
  else if (game.phase == game.phases.trading && 1 <= n && n <= 5) {
    game.handleTradeInChoice(n);
  }
  else if (game.phase == game.phases.acting) {
    game.useDevCard(n);
  }
  else {
    console.log(`Not sure what you think hitting ${n} is ` +
                `supposed to do in ${game.phase} phase...`);
  }
}

document.onkeydown = function(e) {
  if (game.phase == game.phases.initialPlacement) {
    console.log("no doing stuff in setup phase!");
    return;
  }

  // Digit 0-9. Different uses in different phases.
  if (0 <= e.key && e.key <= 9) {
    let n = e.key;
    if (e.shiftKey) n+=10;  // so we can get 10,11,12

    handleNumberInput(n);
  }
  else if (game.phase == game.phases.building ||
           game.phase == game.phases.trading) {
    if (e.key == "Escape") {
      game.setInstructions(`canceled ${game.phase}. ` + ACT_INSTRUCTION);
      game.phase = game.phases.acting;
    }
    else {
      console.log(`Unused key "${e.key}" in ${game.phase} phase.`);
    }
  }
  else if (game.phase == game.phases.acting) {
    switch (e.key) {
      case "Enter":
        game.nextPlayerTurn();
        break;
      case "Escape":
        game.phase = game.phases.acting;
        break;
      case "c":
        game.startBuildPhase(structureTypes.city);
        break;
      case "d":
        game.startBuildPhase(structureTypes.devCard);
        break;
      case "f":
        game.setInstructions('pick a freebie!');
        game.startPickResourcesPhase(1);
        break;
      case "r":
        game.startBuildPhase(structureTypes.road);
        break;
      case "s":
        game.startBuildPhase(structureTypes.settlement);
        break;
      case "t":
        game.startTradingPhase();
        break;
      case "u":
        debug = !debug;
        break;
      default:
        console.log(`Unused key "${e.key}" in ${game.phase} phase.`);
    }
  }
  else {
    console.log(`Unused key "${e.key}" in ${game.phase} phase.`);
  }
};
