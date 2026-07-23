export default class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Click blocker
    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.85)
      .setInteractive();

    // Panel dimensions
    const panelW = W * 0.82;
    const panelH = H * 0.85;
    const panelX = W / 2;
    const panelY = H / 2;

    // Dark blue bg
    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1e2640)
      .setStrokeStyle(2, 0x4a90d9);

    // Close button
    const closeBtn = this.add
      .text(panelX + panelW / 2 - 24, panelY - panelH / 2 + 20, '✕', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '28px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'));
    closeBtn.on('pointerdown', () => {
      this.events.emit('closed');
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('HowToPlayScene');
      });
    });

    // Content container
    this.contentY = 0;
    this.container = this.add.container(0, 0);

    const contentX = panelX - panelW / 2 + 30;
    const startY = panelY - panelH / 2 + 40;
    let cursor = startY;

    // Reusable helpers
    const addTitle = (text, color = '#50c8f4') => {
      const t = this.add.text(contentX, cursor, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '22px',
        color,
        fontStyle: 'bold',
      });
      this.container.add(t);
      cursor += 36;
      return t;
    };

    const addBody = (text) => {
      const t = this.add.text(contentX, cursor, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '15px',
        color: '#d0dff0',
        wordWrap: { width: panelW - 60 },
        lineSpacing: 6,
      });
      this.container.add(t);
      cursor += t.height + 14;
      return t;
    };

    const addDivider = () => {
      const line = this.add.rectangle(
        panelX,
        cursor + 4,
        panelW - 60,
        1,
        0x4a90d9,
        0.4
      );
      this.container.add(line);
      cursor += 20;
    };

    const addSpriteRow = (key, label, desc) => {
      const box = this.add.image(contentX + 24, cursor + 20, key);
      const nameText = this.add.text(contentX + 56, cursor + 4, label, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      const descText = this.add.text(contentX + 56, cursor + 26, desc, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        color: '#a0b8d0',
        wordWrap: { width: panelW - 120 },
      });
      this.container.add([box, nameText, descText]);
      cursor += Math.max(52, descText.height + 34);
    };

    // Introduction
    addTitle('🎮  Getting Started');
    addBody(
      'Create a room from the main menu and share the room code with your friends. ' +
        'They can enter the code to join your session. Once everyone is in, ' +
        'set your team, enter your name, and ready up. The game starts automatically ' +
        'when all players are ready.'
    );
    addDivider();

    // Controls
    addTitle('🕹️  Controls');
    const controls = [
      ['W / ↑', 'Move forward'],
      ['S / ↓', 'Move backward'],
      ['A / ←', 'Rotate left'],
      ['D / →', 'Rotate right'],
      ['SPACE', 'Shoot'],
    ];

    controls.forEach(([key, action]) => {
      const keyText = this.add.text(contentX + 10, cursor, key, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        color: '#50c8f4',
        backgroundColor: '#2a3a5a',
        padding: { x: 8, y: 4 },
      });
      const actionText = this.add.text(contentX + 110, cursor + 4, action, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        color: '#d0dff0',
      });
      this.container.add([keyText, actionText]);
      cursor += 34;
    });
    cursor += 8;
    addDivider();

    // Gamemodes
    addTitle('⚔️  Game Modes');

    addTitle('Player vs Player (PVP)', '#f4c842');
    addBody(
      'Two teams (Red and Blue) compete to reach the kill limit first. ' +
        'Every kill your team scores counts toward your team total. ' +
        'Friendly fire is enabled, but killing a teammate does not reward an upgrade on death. ' +
        'Coordinate your shots and outlast the opposing team.'
    );
    cursor += 6;

    addTitle('Player vs Environment (PVE)', '#5de85d');
    addBody(
      'Team up with friends to survive waves of increasingly powerful AI-controlled bots. ' +
        'Each player has their own individual HP. In PVE, lives are shared across the entire team ' +
        '(or held individually if playing solo). When your HP reaches 0, your team loses 1 shared life. ' +
        'If shared lives hit 0, the game is over. Friendly fire is enabled, but dying to a teammate ' +
        'does not award an upgrade.'
    );
    addDivider();

    // Enemy bots
    addTitle('🤖  Enemy Bots  (PVE)');
    addSpriteRow(
      'black',
      'Chaser',
      'Tracks and follows the nearest player and shoots at them. Standard movement speed, the most common enemy type.'
    );
    addSpriteRow(
      'sand',
      'Berserker',
      'Extremely fast. Does not shoot. Charges directly at players. On contact, both the Berserker and the player are destroyed instantly, dropping playeer HP to 0.'
    );
    addSpriteRow(
      'green',
      'Exploder',
      'Very slow moving. Does not shoot. On contact with a player, explodes and fires bullets in all directions, posing a deadly area denial threat.'
    );
    addDivider();

    // ── SECTION 5 — Map Obstacles ────────────────────────────────────────────
    addTitle('🗺️  Map Obstacles');
    addBody(
      'Both PVP and PVE maps contain two types of static obstacles. Bullets pass through both.'
    );
    cursor += 4;

    addSpriteRow(
      'spike',
      'Spike',
      'Static hazard. On contact, it reduces a player\'s HP by 1. Plan your routes carefully to avoid losing health unnecessarily.'
    );
    addSpriteRow(
      'bounce',
      'Bounce Pad',
      'Static pad. On contact, launches the player or bot away at high speed. Can be used strategically to escape or reposition.'
    );
    addDivider();

    // Powerups
    addTitle('⚡  Powerups');
    addBody(
      'When your HP hits 0 and you die to an enemy or a bot, not by a teammate, your team loses 1 life and you are presented ' +
        'with three powerup options to choose from before respawning. ' +
        'Powerups come in three rarities:'
    );
    cursor += 6;

    const rarities = [
      {
        label: '⬜ Common',
        color: '#aaaaaa',
        desc: 'Basic upgrades. Modest improvements to help you stay in the fight.',
      },
      {
        label: '🟦 Rare',
        color: '#4a90d9',
        desc: 'Stronger upgrades with more noticeable impact on your playstyle.',
      },
      {
        label: '🟨 Legendary',
        color: '#f4c842',
        desc: 'Powerful upgrades that can turn the tide. Harder to come by.',
      },
    ];

    rarities.forEach((r) => {
      const label = this.add.text(contentX + 10, cursor, r.label, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '15px',
        color: r.color,
        fontStyle: 'bold',
      });
      const desc = this.add.text(contentX + 10, cursor + 22, r.desc, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        color: '#a0b8d0',
        wordWrap: { width: panelW - 60 },
      });
      this.container.add([label, desc]);
      cursor += desc.height + 32;
    });

    cursor += 20;
    this.totalContentH = cursor - startY;

    // Scroll mask
    const maskPadding = 16;
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      panelX - panelW / 2,
      panelY - panelH / 2 + maskPadding,
      panelW,
      panelH - maskPadding * 2
    );
    const mask = maskShape.createGeometryMask();
    this.container.setMask(mask);

    // Scroll inputs
    this.maxScroll = Math.max(0, this.totalContentH - (panelH - maskPadding * 2));

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.scrollContent(deltaY * 0.6);
    });

    let dragStartY = 0;
    this.input.on('pointerdown', (pointer) => {
      dragStartY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) {
        const deltaY = dragStartY - pointer.y;
        this.scrollContent(deltaY * 0.8);
        dragStartY = pointer.y;
      }
    });

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  scrollContent(delta) {
    this.contentY = Phaser.Math.Clamp(
      this.contentY - delta,
      -this.maxScroll,
      0
    );
    this.container.y = this.contentY;
  }
}