const POWERUPS = {

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
        display: "Phase through walls",
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