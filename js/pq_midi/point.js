export default class Point {
    constructor(p = {})
    {
        this.x = p.x || 0;
        this.y = p.y || 0;
        this.neighbors = (p.neighbors || []).slice(); // any point it CAN reach
        this.connections = (p.connections || []).slice(); // points to which it's actually connected
        this.metadata = null;
        if(p.metadata) { this.metadata = Object.assign({}, p.metadata); }
    }

    clone() { return new Point(this); }
    round() { return this.setXY(Math.round(this.x), Math.round(this.y)); }

    // setting/overriding
    setX(v = 0) { this.x = v; return this; }
    setY(v = 0) { this.y = v; return this; }
    fromXY(x,y) { return this.setXY(x,y); }
    setXY(x,y) { return this.set({ x: x, y: y }); }
    setFactor(f) { return this.setXY(f,f); }
    set(p = new Point())
    {
        this.setX(p.x);
        this.setY(p.y);
        return this;
    }

    // changing/moving
    moveX(v = 0) { return this.setX(this.x + v); }
    moveY(v = 0) { return this.setY(this.y + v); }
    moveXY(x,y) { return this.move({ x: x, y: y }); }
    moveFactor(f) { return this.moveXY(f,f); }
    add(p = new Point()) { return this.move(p); }
    sub(p = new Point()) { return this.add(p.clone().scaleFactor(-1)); }
    move(p = new Point())
    {
        this.moveX(p.x);
        this.moveY(p.y);
        return this;
    }

    // scaling
    scaleX(v = 0) { return this.setX(v * this.x); }
    scaleY(v = 0) { return this.setY(v * this.y); }
    scaleXY(x,y) { return this.scale({ x: x, y: y }); }
    scaleFactor(f) { return this.scaleXY(f,f); }
    scale(p = new Point())
    {
        this.scaleX(p.x);
        this.scaleY(p.y);
        return this;
    }

    // dimensions
    angle() { return Math.atan2(this.y, this.x); }
    negate() { return this.scaleFactor(-1); }
    normalize() 
    { 
        const l = this.length();
        if(Math.abs(l) <= 0.0001) { return this; }
        return this.scaleFactor(1.0 / l); 
    }

    random()
    {
        const angle = Math.random() * 2 * Math.PI;
        return new Point().setXY(Math.cos(angle), Math.sin(angle));
    }

    clamp(pMin = new Point(), pMax = new Point())
    {
        this.setX(Math.min(Math.max(this.x, pMin.x), pMax.x));
        this.setY(Math.min(Math.max(this.y, pMin.y), pMax.y));
        return this;
    }

    length() { return Math.sqrt(this.lengthSquared()); }
    lengthSquared() 
    { 
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }

    distTo(p = new Point()) { return Math.sqrt(this.distSquaredTo(p)); }
    distSquaredTo(p = new Point())
    {
        return Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2);
    }

    vecTo(p = new Point())
    {
        return new Point().setXY(p.x - this.x, p.y - this.y);
    }

    // neighbors
    addNeighbor(p = new Point()) { this.neighbors.push(p); }
    removeNeighbor(p = new Point())
    {
        const idx = this.getNeighborIndex(p);
        if(idx < 0) { return; }
        this.neighbors.splice(idx, 1);
    }
    countNeighbors() { return this.neighbors.length; }
    getNeighborIndex(p) { return this.neighbors.indexOf(p); }
    hasNeighbor(p) { return this.neighbors.includes(p); }
    canConnectTo(p) { return this.hasNeighbor(p); }
    hasNeighbors() { return this.countNeighbors() > 0; }
    getNeighbors() { return this.neighbors.slice(); }
    clearNeighbors() { this.neighbors = []; }

    // connections
    addConnection(p = new Point()) { this.connections.push(p); }
    removeConnection(p = new Point())
    {
        const idx = this.getConnectionIndex(p);
        if(idx < 0) { return; }
        this.connections.splice(idx, 1);
    }
    countConnections() { return this.connections.length; }
    getConnectionIndex(p) { return this.connections.indexOf(p); }
    hasConnection(p) { return this.connections.includes(p); }
    isConnectedTo(p) { return this.hasConnection(p); }
    hasConnections() { return this.countConnections() > 0; }
    getConnections() { return this.connections.slice(); }
    clearConnections() { this.connections = []; }

    // metadata
    setMetadata(obj) { this.metadata = obj; }
    getMetadata() { return this.metadata; }

    
}