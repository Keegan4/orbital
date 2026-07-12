const Matter = require('matter-js');
const { CONSTANTS } = require('../../public/js/constants.js');

const {
  CATEGORY_WALL,
  CATEGORY_BULLET,
  CATEGORY_TANK,
  CATEGORY_BOUNDARY
} = CONSTANTS;

const wallOptions = {
  isStatic: true,
  label: 'Boundary',
  collisionFilter: {
    category: CATEGORY_BOUNDARY,
    mask: CATEGORY_BULLET | CATEGORY_TANK
  }
};

function createPhysics(mapWidth, mapHeight, cellSize, totalPlayableSpaces) {
  const engine = Matter.Engine.create();
  engine.gravity.y = 0;
  const world = engine.world;

  const interiorWallOptions = {
    isStatic: true,
    label: 'wall',
    collisionFilter: {
      category: CATEGORY_WALL,
      mask: CATEGORY_BULLET | CATEGORY_TANK
    }
  };

  const cols = Math.ceil(mapWidth / cellSize);
  const rows = Math.ceil(mapHeight / cellSize);
  
  // wall 1, floor 0
  const wallGrid = Array.from({ length: rows }, () => Array(cols).fill(1));
  totalPlayableSpaces.forEach(space => {
      const startCol = Math.floor(space.x / cellSize);
      const endCol = Math.floor((space.x + space.w) / cellSize);
      const startRow = Math.floor(space.y / cellSize);
      const endRow = Math.floor((space.y + space.h) / cellSize);
      for (let r = startRow; r < endRow; r++) {
          for (let c = startCol; c < endCol; c++) {
              if (r >= 0 && r < rows && c >= 0 && c < cols) {
                  wallGrid[r][c] = 0; 
              }
          }
      }
  });

  const toMark = [];
  const dirs = [[-1, -1], [-1, 0], [-1, 1], 
    [ 0, -1], [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        // Only wanna change fllor tiles
        if (wallGrid[r][c] !== 0) {
            continue;
        }
        // Checks if the coord is next to a wall in 8 directions
        const touch = dirs.some(([dr, dc]) => {
            const newR = r + dr;
            const newC = c + dc;
            // Dont mark outside the grid
            if (newR < 0 || newR >= rows || newC < 0 || newC >= cols) {
                return false;
            }
            return wallGrid[newR][newC] === 1;
        });
        if (touch) {
            toMark.push([r, c]);
        }
    }
  }
  toMark.forEach(([r, c]) => { wallGrid[r][c] = 2; });

  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
          if (wallGrid[r][c] === 1 && !visited[r][c]) {
              let widthCells = 0;
              while ((c + widthCells) < cols && wallGrid[r][c + widthCells] === 1 && !visited[r][c + widthCells]) {
                  widthCells++;
              }
              let heightCells = 1;
              let canStretchDown = true;
              while ((r + heightCells) < rows && canStretchDown) {
                  for (let k = 0; k < widthCells; k++) {
                      if (wallGrid[r + heightCells][c + k] !== 1 || visited[r + heightCells][c + k]) {
                          canStretchDown = false;
                          break;
                      }
                  }
                  if (canStretchDown) {
                      heightCells++;
                  }
              }
              for (let h = 0; h < heightCells; h++) {
                  for (let w = 0; w < widthCells; w++) {
                      visited[r + h][c + w] = true;
                  }
              }
              const wallWidth = widthCells * cellSize;
              const wallHeight = heightCells * cellSize;
              const wallX = (c * cellSize) + (wallWidth / 2);
              const wallY = (r * cellSize) + (wallHeight / 2);
              const wallBody = Matter.Bodies.rectangle(wallX, wallY, wallWidth, wallHeight, interiorWallOptions);
              Matter.Composite.add(world, wallBody);
          }
      }
  }
  return { engine, world, wallGrid };
}

module.exports = { createPhysics };