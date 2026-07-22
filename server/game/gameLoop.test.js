const { test } = require('node:test');
const assert = require('node:assert');
const { effectiveStats } = require('./gameLoop.js');
const { POWERUPS, powerupsRarity, RARITIES } = require('../../public/js/powerups.js');
const { stat } = require('node:fs');


function makePlayer(powerups) {
    // You basically need this cos effectivestats reads a player
    return {powerups};
}

test('effectiveStats defaults to baseline values with no powerups', () => {
    const stats = effectiveStats(makePlayer([]));
    assert.strictEqual(stats.velocity, 1);
    assert.strictEqual(stats.hpUp, 0);
    assert.strictEqual(stats.wallPhase, false);
});

test('Multiplicative powerups work', () => {
    const stats = effectiveStats(makePlayer([POWERUPS.speedBoost, 
        POWERUPS.speedBoost,]));
    // 1.15 * 1.15 = 1.3225
    assert.ok(Math.abs(stats.velocity - 1.3225) < 1e-9);
});

test('Additive powerups work', () => {
    const stats = effectiveStats(makePlayer([POWERUPS.hpUp, POWERUPS.hpUp,]));
    // 1 + 1 
    assert.strictEqual(stats.hpUp, 2);
});

test('Curses decrease stats', () => {
    const stats = effectiveStats(makePlayer([POWERUPS.cursedBounce, POWERUPS.cursedSpeed,]));

    assert.strictEqual(stats.bulletBounce, -1);
    assert.strictEqual(stats.velocity, 0.85);
});

test('Flags OR correctly, dosent change other flags', () => {
    const stats = effectiveStats(makePlayer([POWERUPS.backShot]));

    assert.strictEqual(stats.backShot, true);
    assert.strictEqual(stats.wallPhase, false);
});