const Matter = require('matter-js');
const { CONSTANTS, WALL_POS } = require('../../public/js/constants.js');

const {
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_THICKNESS,
  CATEGORY_WALL,
  CATEGORY_BULLET,
  CATEGORY_TANK,
} = CONSTANTS;

const engine = Matter.Engine.create();
engine.gravity.y = 0;
const world = engine.world;

const wallOptions = {
  isStatic: true,
  label: 'wall',
  collisionFilter: {
    category: CATEGORY_WALL,
    mask: CATEGORY_BULLET | CATEGORY_TANK
  }
};

const topWall = Matter.Bodies.rectangle(GAME_WIDTH / 2, -WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOptions);
const bottomWall = Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOptions);
const leftWall = Matter.Bodies.rectangle(-WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);
const rightWall = Matter.Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);

const interiorWalls = WALL_POS.map(w =>
  Matter.Bodies.rectangle(
    w.x + w.w / 2,
    w.y + w.h / 2,
    w.w,
    w.h,
    wallOptions
  )
);

Matter.Composite.add(world, [topWall, bottomWall, leftWall, rightWall, ...interiorWalls]);

module.exports = { engine, world };