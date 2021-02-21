const devCardTypes = {
  'knight': 'knight',
  'yop': 'yop',
  'monopoly': 'monopoly',
  'roadBuilding': 'roadBuilding',
  'point': 'point',
}
const devCardImages = {
  knight: new Image(),
  yop: new Image(),
  monopoly: new Image(),
  roadBuilding: new Image(),
  point: new Image(),
  unturned: new Image(),
}
devCardImages.unturned.src = 'images/devCardBack.jpg';
devCardImages.knight.src = 'images/Knight.jpg';
devCardImages.yop.src = 'images/YOP.jpg';
devCardImages.monopoly.src = 'images/Monopoly.jpg';
devCardImages.roadBuilding.src = 'images/RoadBuilding.jpg';
devCardImages.point.src = 'images/Point.jpg';

class DevCard {
  constructor(type) {
    if (!type) type = DevCard.chooseRandomType()
    this.type = type;
  }

  static chooseRandomType() {
    const rand = Math.random();
    if (rand < .4) return devCardTypes.yop;
    if (rand < .7) return devCardTypes.point;
    return devCardTypes.knight;
  }

  isUsable() {
    return this.type != devCardTypes.point;
  }

  pointValue() {
    return this.type == devCardTypes.point ? 1 : 0;
  }

  getImage() {
    return devCardImages[this.type];
  }

  use(game) {
    console.log(`Using ${this.type} card!`);

    switch (this.type) {
      case devCardTypes.knight:
        game.startRobberPhase('you played a Knight!');
        break;
      case devCardTypes.yop:
        game.setInstructions('you played a YOP! Pick 2 resources.')
        game.startPickResourcesPhase(2);
        break;
      case devCardTypes.monopoly:
        console.error("haven't programmed monopoly cards yet!");
        break;
      case devCardTypes.roadBuilding:
        console.error("haven't programmed road building cards yet!");
        break;
      case devCardTypes.point:
        console.error("point cards don't need to/cannot be used.");
        break;
      default:
        console.error(`haven't programmed ${this.type} cards yet!`);
    }
  }
}

export {DevCard};
