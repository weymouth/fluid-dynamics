var bWidth, bHeight, bit, intvl; // globals
var togs, sings;
var streaks, vectors, streams;

function setup() {
    createCanvas(windowWidth, windowHeight);
    //  createCanvas(960,600); // nexus 7

    // set up global button and grid sizes
    bWidth = round(min(width, height) / 8);
    bit = round(0.1 * bWidth);
    bHeight = bWidth - bit;
    intvl = round(bWidth / 2);
    if (intvl % 2 == 1) intvl++;

    // set up image placement
    imageMode(CENTER);

    // initialize view and objects
    togs = new ToggleList();
    sings = new SingList();
    streaks = new Streaklines();
    vectors = new Vectors();
    streams = new Streamlines();
    background(255);
}

function draw() {
    // background
    fill(255, 50);
    noStroke();
    rect(0, 0, width, height);

    // check for objects that needs updating
    vectors.needsUpdate = vectors.needsUpdate || togs.free.hasChanged || sings.haveChanged();
    streams.needsUpdate = streams.needsUpdate || togs.free.hasChanged || sings.haveChanged();
    if (!(vectors.updating | streams.updating)) {
        togs.free.clearChanges();
        sings.clearChanges();
    }

    // draw objects
    if (togs.streak.active) streaks.draw();
    if (togs.vector.active) vectors.draw();
    if (togs.stream.active) streams.draw();
    togs.drawZone();
    sings.drawZone();
    sings.drawPoints();

    // check for reset
    if (togs.reset.active) {
        sings.reset();
        togs.deactivate();
        background(255);
    }

    // // Print frameRate for profiling 
    // fill(0); textSize(32);
    // text(frameRate().toFixed(2), width/2, height/2);
}

function mousePressed() {
    togs.checkZone();
    sings.checkZone();
    sings.checkPoints(); // remove sing and activate
}

function mouseReleased() {
    sings.add(); // place sing and deactivate
}


function velocity(x, y) {
    var p = sings.velocity(x, y);
    if (togs.free.active) p.x += 1;
    return p;
}

function hx() { // nearest grid point in x
    return round(mouseX / intvl) * intvl;
}

function hy() { // nearest grid point in y
    return round(mouseY / intvl) * intvl;
}


// Toggle Buttons
function Toggle(name, x, y) {
    this.name = name;
    this.x = x;
    this.dx = bWidth;
    this.y = y;
    this.dy = bHeight;
    this.icon = loadImage("data/" + name + ".png");
    this.icon.resize(0, bHeight - 2 * bit);
    this.active = false;
    this.hasChanged = false;

    this.checkZone = function() {
        if (mouseX > this.x && mouseY > this.y &&
            mouseX < this.x + this.dx && mouseY < this.y + this.dy) {
            this.active = !this.active;
            this.hasChanged = true;
        }
    };

    this.drawZone = function() {
        stroke(0);
        strokeWeight(1);
        if (this.active) {
            fill(100);
        } else {
            fill(200);
        }
        rect(this.x, this.y, this.dx, this.dy);
        tint(0);
        image(this.icon, this.x + this.dx / 2, this.y + this.dy / 2);
        noTint();
    };

    this.deactivate = function() {
        this.hasChanged = !this.active;
        this.active = false;
    };

    this.clearChanges = function() {
        this.hasChanged = false;
    };
}

function ToggleList() {
    this.tList = [];
    this.reset = new Toggle("reset", bit, bit);
    this.tList[0] = this.reset;
    this.streak = new Toggle("streak", bit + bWidth, bit);
    this.tList[1] = this.streak;
    this.vector = new Toggle("vector", bit + 2 * bWidth, bit);
    this.tList[2] = this.vector;
    this.stream = new Toggle("stream", bit + 3 * bWidth, bit);
    this.tList[3] = this.stream;
    this.free = new Toggle("free", bit + 4 * bWidth, bit);
    this.tList[4] = this.free;

    this.checkZone = function() {
        for (var i = 0; i < 5; i++) this.tList[i].checkZone();
    };

    this.drawZone = function() {
        for (var i = 0; i < 5; i++) this.tList[i].drawZone();
    };

    this.deactivate = function() {
        for (var i = 0; i < 5; i++) this.tList[i].deactivate();
    };

    this.clearChanges = function() {
        for (var i = 0; i < 5; i++) this.tList[i].clearChanges();
    };
}


// Streakline class
function Streaklines() {
    this.num = 500;
    this.particles = [];
    for (var i = 0; i < this.num; i++) this.particles[i] = new Particle();

    this.draw = function() {
        stroke(color(0, 100, 255));
        strokeWeight(bit / 2);
        for (var i = 0; i < this.num; i++) {
            this.particles[i].draw();
            this.particles[i].update();
        }
    };
}

function Particle() {
    this.reset = function() {
        this.age = 0;
        this.life = int(random(200));
        this.p = createVector(random(-100, width), random(1, height));
        this.p0 = createVector(this.p.x, this.p.y);
    };
    this.reset();

    this.draw = function() {
        line(this.p0.x, this.p0.y, this.p.x, this.p.y);
    };

    this.update = function() {
        var h = bit,
            k1 = velocity(this.p.x, this.p.y),
            k2 = velocity(this.p.x + 0.6666 * h * k1.x, this.p.y + 0.6666 * h * k1.y),
            dp = createVector(h * (0.25 * k1.x + 0.75 * k2.x), h * (0.25 * k1.y + 0.75 * k2.y));
        if (dp.mag() < 5 * bit) {
            this.p0 = this.p.copy();
            this.p.add(dp);
            this.age++;
            if (this.p.y > 0 && this.p.x < width && this.p.y < height && this.age < this.life) return;
        }
        this.reset();
    };
}


// Singularity class
function Singularity(name, x, y) {
    this.name = name;
    this.x = x;
    this.dx = bWidth;
    this.y = y;
    this.dy = bHeight;
    this.icon = loadImage("data/" + name + ".png");
    this.icon.resize(bHeight - bit, 0);
    this.active = false;
    this.hasChanged = false;
    this.points = [];

    this.checkZone = function() {
        this.active = this.inZone();
    };

    this.drawZone = function() {
        stroke(0);
        strokeWeight(1);
        if (this.active) {
            fill(100);
        } else {
            fill(200);
        }
        rect(this.x, this.y, this.dx, this.dy);
        tint(0);
        image(this.icon, this.x + this.dx / 2, this.y + this.dy / 2);
        noTint();
    };

    this.deactivate = function() {
        this.hasChanged = !this.active;
        this.active = false;
    };

    this.clearChanges = function() {
        this.hasChanged = false;
    };

    this.inWindow = function() {
        return hx() > 1 && hy() > bWidth + 1 && hx() < width - intvl / 4 && hy() < height - intvl / 4;
    };
    this.inZone = function(buff) { // buffer around the zone
        if (typeof(buff) === 'undefined') buff = 0;
        return mouseX - buff > this.x && mouseY - buff > this.y && mouseX + buff < this.x + this.dx && mouseY + buff < this.y + this.dy;
    };

    this.add = function() {
        if (this.active && this.inWindow()) {
            this.points.push(createVector(hx(), hy()));
            this.hasChanged = true;
        }
        this.active = false;
    };

    this.checkPoints = function() {
        var i = this.points.length;
        while (i--) {
            if (hx() == this.points[i].x && hy() == this.points[i].y) {
                this.points.splice(i, 1);
                this.active = true;
                this.hasChanged = true;
            }
        }
    };

    this.drawPoints = function() {
        for (var i = 0; i < this.points.length; i++) {
            image(this.icon, this.points[i].x, this.points[i].y);
        }
        if (this.active && (this.inWindow() || this.inZone(-intvl / 2))) {
            fill(100, 50);
            noStroke();
            ellipse(hx(), hy(), 2 * bWidth, 2 * bWidth);
            image(this.icon, hx(), hy());
        }
    };

    this.reset = function() {
        this.deactivate();
        this.hasChanged = this.points.length > 0;
        this.points = [];
    };

    this.velocity = function(x, y) {
        var v = createVector(0, 0);
        for (var i = 0; i < this.points.length; i++) {
            var p = createVector((x - this.points[i].x) / float(intvl), (y - this.points[i].y) / float(intvl));
            var m = sq(p.mag()) * 0.25;

            if (name == "source") p.div(m);
            if (name == "sink") p.div(-m);
            if (name == "pvort" | name == "nvort") {
                var q = createVector(p.y, -p.x);
                if (name == "pvort") p = p5.Vector.div(q, m);
                if (name == "nvort") p = p5.Vector.div(q, -m);
            }
            if (name == "dipole") {
                var t = atan2(p.y, p.x);
                var d = createVector(-cos(2 * t), -2 * sin(t) * cos(t));
                p = p5.Vector.mult(d, 5 / m);
            }

            v.add(p);
        }
        return v;
    };
}

function SingList() {
    this.sList = [];
    this.sList[0] = new Singularity("source", width - bit - 5 * bWidth, bit);
    this.sList[1] = new Singularity("sink", width - bit - 4 * bWidth, bit);
    this.sList[2] = new Singularity("pvort", width - bit - 3 * bWidth, bit);
    this.sList[3] = new Singularity("nvort", width - bit - 2 * bWidth, bit);
    this.sList[4] = new Singularity("dipole", width - bit - bWidth, bit);

    this.checkPoints = function() {
        for (var i = 0; i < 5; i++) this.sList[i].checkPoints();
    };

    this.drawPoints = function() {
        for (var i = 0; i < 5; i++) this.sList[i].drawPoints();
    };

    this.add = function() {
        for (var i = 0; i < 5; i++) this.sList[i].add();
    };

    this.velocity = function(x, y) {
        var p = createVector(0, 0);
        for (var i = 0; i < 5; i++) p.add(this.sList[i].velocity(x, y));
        return p;
    };

    this.checkZone = function() {
        for (var i = 0; i < 5; i++) this.sList[i].checkZone();
    };

    this.drawZone = function() {
        for (var i = 0; i < 5; i++) this.sList[i].drawZone();
    };

    this.reset = function() {
        for (var i = 0; i < 5; i++) this.sList[i].reset();
    };

    this.clearChanges = function() {
        for (var i = 0; i < 5; i++) this.sList[i].clearChanges();
    };

    this.haveChanged = function() {
        var hasChanged = false;
        for (var i = 0; i < 5; i++) hasChanged = (hasChanged || this.sList[i].hasChanged);
        return hasChanged;
    };
}


// Vectors Class
function Vectors() {
    this.needsUpdate = true;
    this.updating = false;
    this.arrowImg = loadImage("data/arrow.png");
    this.img = loadImage("data/vector.png");

    this.draw = function() {
        if (this.needsUpdate) { // Update graphic
            this.updating = true;
            image(this.img, bWidth, height - bWidth, intvl, intvl);
            this.update();
        } else { // Draw updated graphic
            image(this.graphic, width / 2, height / 2);
        }
    };

    this.update = function() {
        this.graphic = createGraphics(width, height);
        for (var i = 0; i < width; i += intvl) {
            for (var j = 0; j < height; j += intvl) {
                var v = velocity(i, j),
                    m = v.magSq();
                if (m < 16 && m > 0) this.arrow(i, j, i + 0.75 * intvl * v.x, j + 0.75 * intvl * v.y);
            }
        }
        this.needsUpdate = false;
        this.updating = false;
    };

    this.arrow = function(x1, y1, x2, y2) {
        var a = atan2(x1 - x2, y2 - y1);
        var b = mag(x1 - x2, y2 - y1);
        this.graphic.push();
        this.graphic.translate(x2, y2);
        this.graphic.rotate(a + HALF_PI);
        this.graphic.image(vectors.arrowImg, -b, 0, b, 8);
        this.graphic.pop();
    };
}

// Streamline class
function Streamlines() {
    this.needsUpdate = true,
        this.updating = false;
    this.img = loadImage("data/stream.png");

    this.draw = function() {
        if (this.needsUpdate) { // Update graphic
            this.updating = true;
            image(this.img, bWidth, height - bWidth, intvl, intvl);
            this.update();
        } else { // Draw updated graphic
            image(this.graphic, width / 2, height / 2);
        }
    };

    this.update = function() {
        this.graphic = createGraphics(width, height);
        this.graphic.stroke(100, 100, 100);
        this.graphic.strokeWeight(0.25 * bit);
        // find streamlines starting from seeds
        if (togs.free.active) {
            for (var i = intvl / 2; i < height; i += intvl) drawLine(0, i, false);
        }
        for (var si = 0; si < sings.sList.length; si++) {
            var s = sings.sList[si];
            for (var pi = 0; pi < s.points.length; pi++) {
                var p = s.points[pi];
                if (s.name == "source") {
                    for (var ks = 0; ks < 16; ks++) {
                        drawLine(p.x + intvl * cos(PI * ks / 8), p.y + intvl * sin(PI * ks / 8));
                    }
                    drawLine(p.x - intvl, p.y + 0.001);
                    drawLine(p.x - intvl, p.y - 0.001);
                }
                if (s.name == "dipole") {
                    for (var kd = -5; kd < 6; kd++) {
                        drawLine(p.x - intvl, p.y + 0.25 * bit * kd);
                    }
                    drawLine(p.x - intvl, p.y + 0.0001);
                    drawLine(p.x - intvl, p.y - 0.0001);
                }
                if (s.name == "pvort") {
                    for (var kp = 1; kp < 10; kp++) drawLine(p.x, p.y - intvl * kp - 0.0001, true);
                }
                if (s.name == "nvort") {
                    for (var kn = 1; kn < 10; kn++) drawLine(p.x, p.y + intvl * kn + 0.0001, true);
                }
            }
        }
        this.needsUpdate = false;
        this.updating = false;
    };
}

// draw a streamline with the flow or against (neg=true)
function drawLine(x, y, neg) {
    if (neg) drawLine(x, y, false);
    var p = createVector(x, y);
    var sign = 1;
    if (neg) sign = -1;
    var h = sign * bit;
    for (var i = 0; i < 600; i++) {
        var k1 = velocity(p.x, p.y);
        var k2 = velocity(p.x + 0.666 * h * k1.x, p.y + 0.666 * h * k1.y);
        var dp = createVector(h * (0.25 * k1.x + 0.75 * k2.x), h * (0.25 * k1.y + 0.75 * k2.y));
        var step = dp.mag() / bit;
        if (step > 2) { // step is too big:
            h *= 0.5; // reduce h
            if (sign * h < 0.2) return; // if h is too small, quit
            continue; // else try again
        }
        if (step < 0.2) { // step too small
            h = sign * min(bit, abs(2 * h)); // increase h
            dp.mult(0.2 / step); // minimum step size
        }
        if (p.x < x && p.x + dp.x > x && abs(p.y - y) < bit) return;
        if (p.x > x && p.x + dp.x < x && abs(p.y - y) < bit) return;
        streams.graphic.line(p.x, p.y, p.x + dp.x, p.y + dp.y);
        p.add(dp);
        if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) return;
    }
}