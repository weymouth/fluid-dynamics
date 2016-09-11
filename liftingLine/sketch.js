function setup() {
    createCanvas(windowWidth, windowWidth/2);
    frameRate(30);
    fr = 25;

    // set display parameters
    bit = width / 160
    offset = 50 * bit
    strokeWeight(0.5 * bit);
    textSize(4 * bit);
    textAlign(RIGHT);
    pressed = false;

    // initialize view and objects
    streaks = new Streaklines();
    var p1 = createVector(0.25 * width, 0.5 * height);
    var p2 = createVector(0.75 * width, 0.75 * height);
    vline = new VortexLine(p1, p2, 8);
    background(255);
}

function draw() {
    // background
    fill(255, 50);
    noStroke();
    rect(0, 0, width, height);

    // update vortex line
    vline.update();

    // draw objects
    fr += 0.1 * (frameRate() - fr);
    streaks.draw(fr-25);
    vline.draw()

    // draw text
    noStroke();
    fill(255);
    rect(width - offset, 0, offset, 22 * bit)
    fill(150);
    text("angle of attack: " + degrees(vline.aoa).toFixed(1) + "\u00B0", width - bit, 5 * bit)
    text("maximum camber: " + (vline.cam * 100).toFixed(1) + "%", width - bit, 10 * bit)
    fill(50, 150, 50);
    text("lift coefficient: " + vline.lift.toFixed(2) + " ", width - bit, 15 * bit)
    text("center of effort: " + vline.pcen.x.toFixed(0) + "%", width - bit, 20 * bit)


    // // print frameRate for profiling 
    // fill(0);
    // textSize(32);
    // text("fr = " + fr.toFixed(1) + ", n = " + streaks.particles.length, width, height / 2);
}

function mousePressed() {
    pressed = true;
    vline.mousePressed();
    return false;
}

function mouseReleased() {
    pressed = false;
    return false;
}

function touchMoved() {
    return false;
}

// velocity function including free-stream
function velocity(x) {
    var v = vline.velocity(x);
    v.x += 1;
    return v;
}

// Vortex line class
function VortexLine(x0, x1, num) {
    // init control points
    this.control = [x0, p5.Vector.lerp(x0, x1, 1 / 3), p5.Vector.lerp(x0, x1, 2 / 3), x1];

    // init points and panels
    this.num = num;
    this.points = [];
    this.panels = [];
    for (var i = 0; i < this.num; i++) this.panels[i] = new VortexPanel(x0, x1);

    // upate vortex line geometry
    this.geom = function() {
        //update points and panels
        for (var i = 0; i <= this.num; i++) {
            var x = bezierPoint(this.control[0].x, this.control[1].x,
                    this.control[2].x, this.control[3].x, i / this.num),
                y = bezierPoint(this.control[0].y, this.control[1].y,
                    this.control[2].y, this.control[3].y, i / this.num);
            this.points[i] = createVector(x, y);
            if (i > 0) this.panels[i - 1].set(this.points[i - 1], this.points[i]);
        }

        // compute parameters
        var chord = this.control[3].copy().sub(this.control[0]);
        this.l = chord.mag();
        this.aoa = chord.heading()
        this.cam = 0;
        for (var i = 1; i < this.num; i++) {
            var c = this.control[3].copy().sub(this.points[i]).rotate(-this.aoa).y;
            if (abs(c) > abs(this.cam)) this.cam = c;
        }
        this.cam /= this.l;
    }
    this.geom();

    // Determine if a point is being moved
    this.mousePressed = function() {
        this.pressPoint = createVector(mouseX, mouseY);
        this.moving = -1;
        for (var i = 0; i < 4 && this.moving < 0; i++) {
            var d = dist(mouseX, mouseY, this.control[i].x, this.control[i].y)
            if (d < 3 * bit) this.moving = i;
        }
    }

    // Update vortex line
    this.update = function() {
        if (pressed && this.moving >= 0) {
            var i = this.moving;

            // highlight moving point
            noStroke();
            fill(0, 20);
            ellipse(this.control[i].x, this.control[i].y, 8 * bit, 8 * bit);

            // move point
            this.control[i].add(createVector(mouseX, mouseY).sub(this.pressPoint));
            this.pressPoint = createVector(mouseX, mouseY);

            this.geom();
        }

        // update gamma with under-relaxed gauss-seidel:
        // ... Note: the upwash IS the residual, and
        // ... I use a[i,i] = upwash(i,gamma[i]=1)-upwash(i,gamma[i]=0)
        for (var i = this.num - 1; i >= 0; i--) {
            var g = this.panels[i].gamma[0],
                u0 = this.upwash(i, 0),
                u1 = this.upwash(i, 1);
            this.gamma_set(i, (g - u0 / (u1 - u0)) / 2);
        }

        // compute lift and center of effort
        var s = 0;
        this.lift = 0;
        this.cen = createVector(0, 0);
        for (var i = 0; i < this.num; i++) {
            var g0 = this.panels[i].gamma[0],
                g1 = this.panels[i].gamma[1],
                c0 = p5.Vector.lerp(this.panels[i].x0, this.panels[i].x1, 1 / 3),
                c1 = p5.Vector.lerp(this.panels[i].x0, this.panels[i].x1, 2 / 3);
            s += g0 + g1;
            this.lift += (g0 + g1) / 2 * this.panels[i].l;
            this.cen.add(c0.mult(g0)).add(c1.mult(g1));
        }
        this.cen.div(s);
        this.lift /= -0.5 * this.l;
        this.pcen = this.cen.copy().sub(this.control[0]).rotate(-this.aoa).mult(100 / this.l);
    }

    // set gamma at point i
    this.gamma_set = function(i, a) {
        this.panels[i].gamma[0] = a;
        if (i > 0) this.panels[i - 1].gamma[1] = a;
    }

    // compute velocity through panels[i] when gamma[i]=gi
    this.upwash = function(i, gi) {
        this.gamma_set(i, gi);
        var x = p5.Vector.lerp(this.points[i], this.points[i + 1], 0.5),
            v = velocity(x); // includes free-stream!
        v.rotate(-this.panels[i].a)
        return v.y
    }

    this.velocity = function(x) {
        v = createVector(0, 0);
        for (var i = 0; i < this.num; i++) v.add(this.panels[i].velocity(x));
        return v
    }

    this.draw = function() {
        // chord line 
        stroke(150, 50);
        line(this.points[0].x, this.points[0].y, this.points[this.num].x, this.points[this.num].y)

        // vortex panels
        stroke(255, 100, 100);
        for (var i = 0; i < this.num; i++) this.panels[i].draw();

        // control points
        stroke(255, 155, 50, 50);
        line(this.control[0].x, this.control[0].y, this.control[1].x, this.control[1].y, bit, bit);
        line(this.control[2].x, this.control[2].y, this.control[3].x, this.control[3].y, bit, bit);
        fill(255);
        ellipse(this.control[1].x, this.control[1].y, 2 * bit, 2 * bit);
        ellipse(this.control[2].x, this.control[2].y, 2 * bit, 2 * bit);
        ellipse(this.control[0].x, this.control[0].y, 2 * bit, 2 * bit);
        ellipse(this.control[3].x, this.control[3].y, 2 * bit, 2 * bit);

        // force
        stroke(100, 255, 100, 200);
        line(this.cen.x, this.cen.y, this.cen.x, this.cen.y - this.lift * this.l / 10)
        ellipse(this.cen.x, this.cen.y, 2 * bit, 2 * bit);
    }
}

// VortexPanel class
function VortexPanel(x0, x1) {
    this.set = function(x0, x1) {
        this.x0 = x0.copy();
        this.x1 = x1.copy();
        var s = p5.Vector.sub(x1, x0);
        this.l = s.mag();
        this.a = s.heading();
    }
    this.gamma = [0, 0];
    this.set(x0, x1);

    // Induced velocity
    this.velocity = function(x) {
        // transform to panel-frame
        var xp = p5.Vector.sub(x, this.x0); // translate
        xp.rotate(-this.a);

        // compute velocity and rotate back
        var up = this.pVelocity(xp.x, xp.y);
        return up.rotate(this.a);
    }

    // Induced velocity in panel-frame
    this.pVelocity = function(x, y) {
        // r-squared and theta from panels ends to point
        var xp = this.l - x,
            r0 = sq(x) + sq(y),
            t0 = atan2(y, x),
            r1 = sq(xp) + sq(y),
            t1 = atan2(y, -xp);

        // check for r==0 and precompute deltas
        if (r0 < 1e-6 || r1 < 1e-6) return 0;
        var lr = log(r1 / r0) / 2,
            dt = t1 - t0;

        // compute velocity contributions
        var u0 = this.gamma[0] * (-y * lr + xp * dt),
            u1 = this.gamma[1] * (y * lr + x * dt),
            v0 = this.gamma[0] * (xp * lr + y * dt - this.l),
            v1 = this.gamma[1] * (x * lr - y * dt + this.l);
        return createVector((u0 + u1) / TWO_PI / this.l, (v0 + v1) / TWO_PI / this.l);
    }

    this.draw = function() {
        line(this.x0.x, this.x0.y, this.x1.x, this.x1.y);
    }
}

// Streakline class
function Streaklines() {
    this.particles = [];
    for (var i = 0; i < 50; i++) this.particles[i] = new Particle();

    this.draw = function(fr) {
        if (fr < -1 && this.particles.length > 50) this.particles.splice(1,-1);
        if (fr > 1 && this.particles.length < 500) this.particles.push(new Particle());

        stroke(0, 100, 255);
        for (var i = 0; i < this.particles.length; i++) {
            this.particles[i].draw();
            this.particles[i].update();
        }
    };
}

// Tracer particle class
function Particle() {
    // Random reset
    this.reset = function() {
        this.age = 0;
        this.life = int(random(200));
        this.p = createVector(random(-100, width), random(1, height));
        this.p0 = createVector(this.p.x, this.p.y);
    }
    this.reset();

    this.draw = function() {
        line(this.p0.x, this.p0.y, this.p.x, this.p.y);
    }

    // Update position using velocity function
    this.update = function() {
        // two-step Runge-Kutta integration
        var h = bit,
            k1 = velocity(this.p),
            k2 = velocity(this.p.copy().add(k1.copy().mult(0.6666 * h))),
            dp = ((k1.mult(0.25)).add(k2.mult(0.75))).mult(h);

        // move particle
        if (dp.mag() < 5 * h) {
            this.p0 = this.p.copy();
            this.p.add(dp);
            this.age++;
            if (this.p.y > 0 && this.p.x < width && this.p.y < height && this.age < this.life) return;
        }
        this.reset();
    }
}