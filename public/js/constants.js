
const CONSTANTS = {
    TICK_RATE : 60,
    TANK_SPEED : 150,
    TANK_ANGULAR_SPEED : 2.5,
    GAME_WIDTH : 800,
    GAME_HEIGHT : 600,
    WALL_THICKNESS : 100,
    BULLET_SPEED : 500,
    BULLET_RADIUS : 5,
    MAX_BOUNCES : 6,
    FIRE_COOLDOWN : 300,
    BULLET_LIFESPAN : 10000,
    CATEGORY_WALL   : 0x0001,
    CATEGORY_BULLET : 0x0002,
    CATEGORY_TANK: 0x0004
}
const coords = [
    {x1: 258, y1: 0, x2: 304, y2: 155},
    {x1: 488, y1: 117, x2: 538, y2: 402},
    {x1: 0, y1: 260, x2: 240, y2: 340}
]
const WALL_POS = coords.map(x => {
    return {
        x: x.x1,
        y: x.y1,
        w: x.x2- x.x1,
        h: x.y2 - x.y1,
        }
})

if (typeof module !== 'undefined') module.exports = {CONSTANTS, WALL_POS};