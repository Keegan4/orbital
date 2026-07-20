
const CONSTANTS = {
    // Game config
    GAME_WIDTH : 800,
    GAME_HEIGHT : 600,
    WALL_THICKNESS : 100,
    CELL_SIZE: 32,

    // Map (EVERYTHING MULTIPLES OF 32)
    // maybe 2016 too big
    MAP_CONFIG: {
        MAP_WIDTH: 1024,
        MAP_HEIGHT: 1024,
        CELL_SIZE: 32,
        GLOBAL_PADDING: 64,
        PADDING: 32,
        NO_PARTITIONS: 4,
        MIN_PARTITION_SIZE: 256,
        CORRIDOR_SIZE: 96,
        MIN_DUNGEON_WIDTH: 160,
        MIN_DUNGEON_HEIGHT: 160
    },

    RED_TEAM: 'red',
    BLUE_TEAM: 'blue',
    LIVES_PLAYER: 3,
    STARTING_ENEMIES: 3,
    WAVE_COOLDOWN: 5000,

    // Hazard stuff
    BOUNCE_FORCE: 20,

    // Tank atributes
    FRIENDLY_TEAM: "blue",
    TICK_RATE : 60,
    TANK_SPEED : 150,
    TANK_ANGULAR_SPEED : 2.5,
    BULLET_SPEED : 500,
    BULLET_RADIUS : 5,
    MAX_BOUNCES : 2,
    FIRE_COOLDOWN : 1000,
    BULLET_LIFESPAN : 4000,
    RESPAWN_TIME : 3,

    // Category Ids 
    // Note they need to be powers of 2 if not you cant bitwise OR properly
    CATEGORY_WALL   : 0x0001,
    CATEGORY_BULLET : 0x0002,
    CATEGORY_TANK: 0x0004,
    CATEGORY_BOUNDARY: 0x0008,
    CATEGORY_HAZARD: 0x0010,
    RESPAWN_LIMIT: 300,
    MIN_DIST: 300,
    TICK_DELTA : 1 / 60,

    // Enemy Constants
    ENEMY_TEAM : "black",
    SPAWN_COOLDOWN : 2000,
    BOT_LIMIT: 3,
    TURN_THRESHOLD: 0.1,
    NEW_TARGET: 1000,
    FIRE_CHANCE: 0.2,
    WALL_BUFFER: 1,
    EXPLODE_COUNT: 5,

    // Powerup configs
    RARE_CHANCE: 0.3,
    LEGEND_CHANCE: 0.1,
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

const makeButton = (scene, x, y, label, bgColor, onClick, w = 240, h = 64, r = 16) => {
      //const w = 240, h = 64, r = 16;
      const con = scene.add.graphics();
      const txt = scene.add.text(0, 0, label, {
        fontFamily: 'Fredoka', 
        fontSize: '26px', 
        fontStyle: '700', 
        color: '#ffffff',
        resolution: 2
      }).setOrigin(0.5);
      const drawBackground = (colorInput) => {
        const parsedColor = Phaser.Display.Color.ValueToColor(colorInput).color;
        con.clear();
        con.fillStyle(0x141a2b, 1);
        con.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, r + 2);
        con.fillStyle(parsedColor, 1);
        con.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      };
      drawBackground(bgColor);

      let isPressed = false;
      const btn = scene.add.container(x, y, [con, txt]);
      btn.setSize(w, h).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => scene.tweens.add({ targets: btn, scale: 1.08, duration: 120, ease: 'Back.easeOut' }));
      btn.on('pointerout',  () => scene.tweens.add({ targets: btn, scale: 1.0,  duration: 100 }));
      btn.on('pointerdown', () => { isPressed = true; btn.setScale(0.96); scene.sound.play('click'); });
      btn.on('pointerup',   () => { if (isPressed) { isPressed = false; btn.setScale(1.06); onClick(); }});
      btn.setText = (newText) => {
        txt.setText(newText);
        txt.setOrigin(0.5); 
        return btn;
      };
      btn.setBackgroundColor = (newBgColor) => {
        drawBackground(newBgColor);
        return btn;
      };
      btn.setColor = (newColor) => {
        txt.setColor(newColor);
        return btn;
      };
      return btn;
    };

function makeMusic(scene, key, config = {loop: true, volume: 0.2}) {
  const current = scene.registry.get('music');
  const currentKey = scene.registry.get('musicKey');

  // Just return the same music if its currently playing
  if (currentKey === key && current && current.isPlaying) {
    return current;
  }

  if (current) {
    current.stop();
    current.destroy();
  }
  const next = scene.sound.add(key, config);
  next.play();
  scene.registry.set("music", next);
  scene.registry.set("musicKey", next);
  return next;
}

if (typeof module !== 'undefined') module.exports = {CONSTANTS, WALL_POS, coords, makeButton};