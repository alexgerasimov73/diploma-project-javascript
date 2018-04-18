'use strict';

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	plus(vector) {
		if (!(vector instanceof Vector)) {
			throw new Error('Можно прибавлять к вектору только вектор типа Vector');
		}
		return new Vector(this.x + vector.x, this.y + vector.y);
	}

	times(coefficient) {
		return new Vector(this.x * coefficient, this.y * coefficient);
	}
}

class Actor {
	constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
		if (!((pos instanceof Vector) && (size instanceof Vector) && (speed instanceof Vector))) {
			throw new Error();
		}
		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}

	act() {}

	get type() {
		return 'actor';
	}

	get left() {
		return this.pos.x;
	}

	get top() {
		return this.pos.y;
	}

	get right() {
		return this.pos.x + this.size.x;
	}

	get bottom() {
		return this.pos.y + this.size.y;
	}

	isIntersect(actor) {
		if (!(actor instanceof Actor)) {
			throw new Error();
		}
		else if (actor === this) {
			return false;
		}
		else if ((((this.left < actor.right) && (this.left >= actor.left)) || 
				((this.right > actor.left) && (this.right <= actor.right)) || 
				((this.left < actor.left) && (this.right > actor.right))) &&
				(((this.top < actor.bottom) && (this.top >= actor.top)) ||
				((this.bottom > actor.top) && (this.bottom <= actor.bottom)) ||
				((this.top < actor.top) && (this.bottom > actor.bottom)))) {
			return true;
		}
		else {
			return false;
		}
	}
}

class Level {
	constructor(grid = [], actors = []) {
		this.grid = grid;
		this.actors = actors;
		this.status = null;
		this.finishDelay = 1;
		this.player = actors.find(el => el.type === 'player');
		if (grid.length === 0) {
			this.height = 0;
			this.width = 0;
		}
		else {
			this.height = grid.length;
			let max;
			grid.forEach(function(el) {
				let arrayMax = [];
				arrayMax.push(el.length);
				max = Math.max(...arrayMax);
			});
			this.width = max;
		}
	}

	isFinished() {
		if ((this.status !== null) && (this.finishDelay < 0)) {
			return true;
		}
		else {
			return false;
		}
	}

	actorAt(movingObject) {
		if (!(movingObject instanceof Actor)) {
			throw new Error();
		}
		else if (this.actors.length === 1) {
			return;
		}
		else {
			return this.actors.find(el => el.isIntersect(movingObject));
		}
	}

	obstacleAt(pos, size) {
		if (!((pos instanceof Vector) && (size instanceof Vector))) {
			throw new Error();
		}
		else if (pos.x < 0 || (pos.x + size.x) > this.width || pos.y < 0) {
			return 'wall';
		}
		else if ((pos.y + size.y) > this.height) {
			return 'lava';
		}
		for (let y = Math.floor(pos.y); y < (pos.y + size.y); y++) {
			for (let x = Math.floor(pos.x); x < (pos.x + size.x); x++) {
				if (this.grid[y][x] === 'wall' || this.grid[y][x] === 'lava') {
					return this.grid[y][x];
				}
			}
		}
	}

	removeActor(object) {
		this.actors.splice(this.actors.indexOf(object), 1);
	}

	noMoreActors(objectType) {
		if ((this.actors.findIndex((el) => el.type === objectType) === -1) ||
			(this.actors === undefined)) {
				return true;
		}
		else {
			return false;
		}
	}

	playerTouched(objectType, movingObject = new Actor()) {
		if (objectType === 'lava' || objectType === 'fireball') {
			this.status = 'lost';
		}
		else if (objectType === 'coin' && movingObject.type === 'coin') {
			this.removeActor(movingObject);
			if (this.noMoreActors(objectType)) {
				this.status = 'won';
			}
		}
	}
}

class LevelParser {
	constructor(actorsDictionary = {}) {
		this.actorsDictionary = actorsDictionary;
	}

	actorFromSymbol(symbol) {
		if ('symbol' in this.actorsDictionary) {
			return;
		}
		else {
			return this.actorsDictionary[symbol];
		}
	}

	obstacleFromSymbol(symbol) {
		if (symbol === 'x') {
			return 'wall';
		}
		else if (symbol === '!') {
			return 'lava';
		}
		else {
			return undefined;
		}
	}

	createGrid(staticObjects) {
		return staticObjects.map(el => el.split('').map(el => this.obstacleFromSymbol(el)));
	}

	createActors(movingObjects) {
		let movObjArray = [];
		if (movingObjects.length === 0) {
			return movObjArray;
		}
		else {
			movingObjects.forEach((y, yIndex) => {
				y.split('').forEach((x, xIndex) => {
					let ActorFromSymbolConstr = this.actorFromSymbol(x);
					if (typeof(ActorFromSymbolConstr) === 'function' && ActorFromSymbolConstr !== undefined) {
						let object = new ActorFromSymbolConstr(new Vector(xIndex, yIndex));
						if (object instanceof Actor) {
							movObjArray.push(object);
						}
					}
				});
			});
		}
		return movObjArray;
	}

	parse(plan) {
		let staticObjects = this.createGrid(plan);
		let movingObjects = this.createActors(plan);
		return new Level(staticObjects, movingObjects);
	}
}

class Fireball extends Actor {
	constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
		super(...arguments);
		this.pos = pos;
		this.speed = speed;
		this.size = new Vector(1, 1);
	}

	get type() {
		return 'fireball';
	}

	getNextPosition(time = 1) {
		let nextPositionX = this.pos.x + (this.speed.x * time);
		let nextPositionY = this.pos.y + (this.speed.y * time);
		return new Vector(nextPositionX, nextPositionY);
	}

	handleObstacle() {
		this.speed.x *= -1;
		this.speed.y *= -1;
	}

	act(time, level) {
		let nextPos = this.getNextPosition(time);
		if (level.obstacleAt(nextPos, this.size) === 'wall' || 
			level.obstacleAt(nextPos, this.size) === 'lava') {
			return this.handleObstacle();
		}
		else {
			this.pos = nextPos;
		}
	}
}

class HorizontalFireball extends Fireball {
	constructor(pos = new Vector()) {
		super(...arguments);
		this.pos = pos;
		this.size = new Vector(1, 1);
		this.speed = new Vector(2, 0);
	}
}

class VerticalFireball extends Fireball {
	constructor(pos = new Vector()) {
		super(...arguments);
		this.pos = pos;
		this.size = new Vector(1, 1);
		this.speed = new Vector(0, 2);
	}
}

class FireRain extends Fireball {
	constructor(pos = new Vector()) {
		super(...arguments);
		this.startedPos = pos;
		this.size = new Vector(1, 1);
		this.speed = new Vector(0, 3);
	}

	handleObstacle() {
		this.pos = this.startedPos;
		this.speed = this.speed;
	}
}

class Coin extends Actor {
	constructor(pos = new Vector()) {
		super(...arguments);
		this.size = new Vector(0.6, 0.6);
		this.pos = pos.plus(new Vector(0.2, 0.1));
		this.startingPosition = pos.plus(new Vector(0.2, 0.1));
		this.springSpeed = 8;
		this.springDist = 0.07;
		this.spring = Math.random() * 2 * Math.PI;
	}

	get type() {
		return 'coin';
	}

	updateSpring(time = 1) {
		this.spring += this.springSpeed * time;
	}

	getSpringVector() {
		let springVector = Math.sin(this.spring) * this.springDist;
		return new Vector(0, springVector);
	}

	getNextPosition(time = 1) {
		this.updateSpring(time);
		return this.startingPosition.plus(this.getSpringVector());
	}

	act(time) {
		this.pos = this.getNextPosition(time);
	}
}

class Player extends Actor {
	constructor(pos = new Vector()) {
		super(...arguments);
		this.pos = pos.plus(new Vector(0, -0.5));
		this.size = new Vector(0.8, 1.5);
	}

	get type() {
		return 'player';
	}
}

const actorDict = {
	'@': Player,
	'v': FireRain,
	'=': HorizontalFireball,
	'o': Coin,
	'|': VerticalFireball
  }

//Для запуска игры на локальном сервере раскомментируйте код. Строки 314 - 317 и закомментируйте строки 319 - 418

/*const parser = new LevelParser(actorDict);
loadLevels()
  .then(schemas => runGame(JSON.parse(schemas), parser, DOMDisplay))
  .then(() => alert('Вы выиграли приз!'));*/

const schemas = [
  [
	"     v                 ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"  |xxx       w         ",
	"  o                 o  ",
	"  x               = x  ",
	"  x          o o    x  ",
	"  x  @    *  xxxxx  x  ",
	"  xxxxx             x  ",
	"      x!!!!!!!!!!!!!x  ",
	"      xxxxxxxxxxxxxxx  ",
	"                       "
  ],
  [
	"     v                 ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"  |                    ",
	"  o                 o  ",
	"  x               = x  ",
	"  x          o o    x  ",
	"  x  @       xxxxx  x  ",
	"  xxxxx             x  ",
	"      x!!!!!!!!!!!!!x  ",
	"      xxxxxxxxxxxxxxx  ",
	"                       "
  ],
  [
	"        |           |  ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"                       ",
	"     |                 ",
	"                       ",
	"         =      |      ",
	" @ |  o            o   ",
	"xxxxxxxxx!!!!!!!xxxxxxx",
	"                       "
  ],
  [
	"                       ",
	"                       ",
	"                       ",
	"    o                  ",
	"    x      | x!!x=     ",
	"         x             ",
	"                      x",
	"                       ",
	"                       ",
	"                       ",
	"               xxx     ",
	"                       ",
	"                       ",
	"       xxx  |          ",
	"                       ",
	" @                     ",
	"xxx                    ",
	"                       "
  ], [
	"   v         v",
	"              ",
	"         !o!  ",
	"              ",
	"              ",
	"              ",
	"              ",
	"         xxx  ",
	"          o   ",
	"        =     ",
	"  @           ",
	"  xxxx        ",
	"  |           ",
	"      xxx    x",
	"              ",
	"          !   ",
	"              ",
	"              ",
	" o       x    ",
	" x      x     ",
	"       x      ",
	"      x       ",
	"   xx         ",
	"              "
  ]
];

const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => alert('Вы выиграли!'));

