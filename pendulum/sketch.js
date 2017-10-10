var mSlider, theta, dtheta;

function setup() {
  // create canvas
  createCanvas(710, 710);
  textSize(15);

  // create sliders
  mSlider = createSlider(-10, 10, 10);
  mSlider.position(20, 20);
  
  // initial pendulum conditions
  theta = 0.6;
  dtheta = 0;
}

function draw() {
    
  // set mass ratio and color based on slider
  var m = mSlider.value()/5;
  var m_star = 10**m;
  var r = (m+3)*50
  var gb = 255-(m+2)*50
  background(r, 255, 255);
  text("m_star: "+str(Math.round(m_star*100)/100), 160, 35);
  
  // set pendulum parameters
  var C_a = 0.5;
  var dt = 0.01;
  var l = 300;
  var g = 0.25;

  // use angular momentum to find acceleration
  var tau = (1-m_star)*g*l*sin(theta);
  var I = (m_star+C_a);
  var ddtheta = tau/I;
  
  // integrate in time
  dtheta += dt*ddtheta;
  theta += dt*dtheta;

  // plot the pendulum
  var x0 = 350;
  var y0 = 350;
  var dx = l*sin(theta);
  var dy = l*cos(theta);
  fill(0,0,0);
  ellipse(x0+dx,y0+dy,40,40);
  stroke(0,0,0);
  line(x0,y0,x0+dx,y0+dy);
}
