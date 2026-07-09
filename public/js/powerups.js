const POWERUPS = {
    // Curses

    cursedHp: {
        id: "cursedHp",
        display: "Lower Hp",
        rarity: "curse",
        disc: "-1 Hit Point",
        stats: {hpUp: -1}
    },

    cursedTurn: {
        id: "cursedTurn",
        display: "Lower Turning Speed",
        rarity: "curse",
        disc: "-15% turning speed",
        stats: {angularVelo: 0.85}
    },

    cursedSpeed: {
        id: "cursedSpeed",
        display: "Lower Speed",
        rarity: "curse",
        disc: "-15% speed",
        stats: {velocity: 0.85}
    },

    cursedLife: {
        id: "cursedLife",
        display: "Lower bullet Life",
        rarity: "curse",
        disc: "-15% bullet lifespan",
        stats: {bulletLife: 0.85}
    },

    cursedBulletSpeed: {
        id: "cursedBulletSpeed",
        display: "Lower bullet speed",
        rarity: "curse",
        disc: "-15% bullet speed",
        stats: {bulletVelo: 0.85}
    },


    // Common Powerups
    turnBoost: {
        id: "turnBoost",
        display: "Increase Turning Speed",
        rarity: "common",
        disc: "+15% turning speed",
        stats: {angularVelo: 1.15}
    },
    speedBoost: {
        id: "speedBoost",
        display: "Increase Speed",
        rarity: "common",
        disc: "+15% movement speed",
        stats: {velocity: 1.15}
    },
    bulletSpeed: {
        id: "bulletSpeed",
        display: "Increase Bullet Speed",
        rarity: "common",
        disc: "+15% bullet speed",
        stats: {bulletVelo: 1.15}
    },
    bulletBounce: {
        id: "bulletBounce",
        display: "Increase bullet bounces",
        rarity: "common",
        disc: "+2 bullet bounces",
        stats: {bulletBounce: 2}
    },

    bulletLife: {
        id: "bulletLife",
        display: "Increase bullet LifeSpan",
        rarity: "common",
        disc: "+15% bullet LifeSpan",
        stats: {bulletLife: 1.15}
    },

    hpUp: {
        id: "hpUp",
        display: "Hp Up",
        rarity: "common",
        disc: "You can take another hit",
        stats: {hpUp: 1}
    },

    // Rare Powerups
    backShot: {
        id: "backShot",
        display: "Shoot Behind you",
        rarity: "rare",
        disc: "You shoot behind you",
        flag: {backShot: true}
    },

    multiShot: {
        id: "multiShot",
        display: "+1 bullet shot",
        rarity: "rare",
        disc: "Shoot an additional bullet in front",
        stats: {frontBullets: 1}
    },

    

    bulletAccelerate: {
        id: "bulletAccelerate",
        display: "Accelerating bullets",
        rarity: "rare",
        disc: "Your bullets gain speed on bounce (Stacks). +2 bullet bounces",
        stats: {bulletAccelerate: 1.1, bulletBounce: 2}
    },

    tankUp: {
        id: "tankUp",
        display: "Tank Up",
        rarity: "rare",
        disc: "Massively increased Hp, lose speed",
        stats: {hpUp: 2, velocity: 0.5}
    },
    /*
    skullShot: {
        id: "skullShot",
        display: "Shoot a skull every 3 bullets",
        rarity: "rare",
        disc: "Skulls teleport players randomly",
        flag: {skullShot: true}
    },

    rockShot: {
        id: "rockShot",
        display: "Shoot a rock every 3 bullets",
        rarity: "rare",
        disc: "Rocks destroy bullets and knockBack players",
        flag: {rockShot: true}
    },
    */

    // Legendary Powerups
    quadShot: {
        id: "quadShot",
        display: "Shoot 4 more bullets at once!",
        rarity: "legendary",
        disc: "Shoot 4 additional bullets",
        stats: {frontBullets: 4}
    },

    selfHarm: {
        id: "selfHarm",
        display: "Immunity to self harm",
        rarity: "legendary",
        disc: "You can no longer be damaged from your own bullets",
        flag: {selfHarmImmune: true}
    },

    wallPhase: {
        id: "wallPhase",
        display: "Phase through walls",
        rarity: "legendary",
        disc: "Walls cannot stop you",
        flag: {wallPhase: true}
    },

    bulletPhase: {
        id: "bulletPhase",
        display: "Bullets phase through walls",
        rarity: "legendary",
        disc: "Bullets are no longer stopped by walls",
        flag: {bulletPhase: true}
    },

    // Bullet can slow down and explode
}

const RARITIES = {"common": "#5D62F5", "rare": "#279CF5", "legendary": "#D3AF37"}

function powerupsRarity(rarity) {
    return Object.values(POWERUPS).filter(x => x.rarity === rarity);
}

if (typeof module !== 'undefined') module.exports = {POWERUPS, powerupsRarity, RARITIES};