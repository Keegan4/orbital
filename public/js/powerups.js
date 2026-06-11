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
        display: "Increase Speed",
        rarity: "common",
        disc: "+15% movement speed",
        stats: {velocity: 1.15}
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

    rockShot: {
        id: "rockShot",
        display: "Shoot a rock every 3 bullets",
        rarity: "rare",
        disc: "Rocks destroy bullets and knockBack players",
        flag: {rockShot: true}
    },

    rockShot: {
        id: "skullShot",
        display: "Shoot a skull every 3 bullets",
        rarity: "rare",
        disc: "Skulls teleport players randomly",
        flag: {skullShot: true}
    },


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
        disc: "Walls cannot stop you",
        flag: {bulletPhase: true}
    },


}