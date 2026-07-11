class Node {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.left  = null;
      this.right = null;
      this.dungeon  = null;
      this.corridors = [];
    }

    // returns true if split successfully
    // only return false when not possible to split into 2
    split(minSize) {
        if (this.w <= minSize || this.h <= minSize) return false;
        const splitH = Math.random() > 0.5 ? true : false;
        if (splitH) {
            const minSplit = minSize;
            const maxSplit = this.h - minSize;
            if (maxSplit < minSplit) return false;
            
            const range = Math.floor((maxSplit - minSplit) / 32);
            const cut = minSplit + (Math.floor(Math.random() * (range + 1)) * 32);
            this.left = new Node(this.x, this.y, this.w, cut);
            this.right = new Node(this.x, this.y + cut, this.w, this.h - cut);
        } else {
            const minSplit = minSize;
            const maxSplit = this.w - minSize;
            if (maxSplit < minSplit) return false;
            
            const range = Math.floor((maxSplit - minSplit) / 32);
            const cut = minSplit + (Math.floor(Math.random() * (range + 1)) * 32);
            this.left = new Node(this.x, this.y, cut, this.h);
            this.right = new Node(this.x + cut, this.y, this.w - cut, this.h);
        }
        return true;
    }

    createDungeons(padding, corridorSize, minW, minH) {
        if (this.left === null) {
            this.placeDungeon(padding, minW, minH);
        } else {
            // this ensures connectedness because its connecting dungeons
            // bottom up
            this.left.createDungeons(padding, corridorSize, minW, minH);
            this.right.createDungeons(padding, corridorSize, minW, minH);
            this.connectChildren(corridorSize);
        }
    }

    placeDungeon(padding, minW, minH) {
        const maxW = this.w - padding * 2;
        const maxH = this.h - padding * 2;
        if (maxW < minW || maxH < minH) return;
        const w = minW + Math.floor(Math.random() * (((maxW - minW) / 32) )) * 32;
        const h = minH + Math.floor(Math.random() * (((maxH - minH) / 32) )) * 32;
        const x = this.x + padding + Math.floor(Math.random() * (((this.w - w - padding * 2) / 32) )) * 32;
        const y = this.y + padding + Math.floor(Math.random() * (((this.h - h - padding * 2) / 32) )) * 32;
        this.dungeon = { x: x, y: y, w: w, h: h };
    }

    connectChildren(corridorSize) {
        const a = this.left.getDungeon();
        const b = this.right.getDungeon();
        if (!a || !b) return;
        
        // centres of each dungeon
        const ax = Math.floor(a.x + a.w / 2);
        const ay = Math.floor(a.y + a.h / 2);
        const bx = Math.floor(b.x + b.w / 2);
        const by = Math.floor(b.y + b.h / 2);
        
        const halfSize = Math.floor(corridorSize / 2);
        
        if (Math.random() > 0.5) {
            // horizontal then vertical
            // joint corner is at (bx, ay)
            const startX = Math.min(ax, bx) - halfSize;
            const endX = Math.max(ax, bx) + halfSize;
            this.corridors.push({ 
                x: startX, 
                y: ay - halfSize, 
                w: endX - startX, 
                h: corridorSize, 
                dir: 'H' 
            });

            const startY = Math.min(ay, by) - halfSize;
            const endY = Math.max(ay, by) + halfSize;
            this.corridors.push({ 
                x: bx - halfSize, 
                y: startY, 
                w: corridorSize, 
                h: endY - startY, 
                dir: 'V' 
            });

        } else {
            // vertical then horizontal
            // joint corner is at (ax, by)
            const startY = Math.min(ay, by) - halfSize;
            const endY = Math.max(ay, by) + halfSize;
            this.corridors.push({ 
                x: ax - halfSize, 
                y: startY, 
                w: corridorSize, 
                h: endY - startY, 
                dir: 'V' 
            });

            const startX = Math.min(ax, bx) - halfSize;
            const endX = Math.max(ax, bx) + halfSize;
            this.corridors.push({ 
                x: startX, 
                y: by - halfSize, 
                w: endX - startX, 
                h: corridorSize, 
                dir: 'H' 
            });
        }
    }

    getDungeon() {
        if (this.dungeon) return this.dungeon;
        const lr = this.left  ? this.left.getDungeon()  : null;
        const rr = this.right ? this.right.getDungeon() : null;
        if (!lr) return rr;
        if (!rr) return lr;
        return Math.random() > 0.5 ? lr : rr;
    }

    getDungeons(dungeons = []) {
        if (this.dungeon) {
            dungeons.push(this.dungeon);
            return dungeons;
        }

        if (this.left) this.left.getDungeons(dungeons);
        if (this.right) this.right.getDungeons(dungeons);
        return dungeons;
    }

    getCorridors(corridors = []) {
        if (this.corridors.length > 0) {
            corridors.push(...this.corridors);
        }
        if (this.left) this.left.getCorridors(corridors);
        if (this.right) this.right.getCorridors(corridors);
        return corridors;
    }
}

function buildMap(node, noPartitions, padding, minPartitionSize, corridorSize, minW, minH) {
    let count = 1;
    const queue = [node];
    while (queue.length > 0 && count < noPartitions) {
        const curr = queue.shift();
        const canSplit = curr.split(minPartitionSize);
        if (canSplit) {
            queue.push(curr.left);
            queue.push(curr.right);
            count += 1
        }
    }
    node.createDungeons(padding, corridorSize, minW, minH);
    return node;
}

module.exports = { Node, buildMap };