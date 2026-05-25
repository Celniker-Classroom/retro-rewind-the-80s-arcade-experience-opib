new Q5("global");

let gameState = "title";

let score            = 0;
let highScore        = 0;
let currentWave      = 1;
let shieldHP         = 3;
let bulletsRemaining = 25;
let bulletRecharge   = 0;
let bulletRechargeInterval = 144;

let waveTimer    = 0;
let waveTimerMax = 1200;

let bombCount  = 3;
let activeBomb = null;
let explosions = [];


let stars            = [];
let screenFlashTimer = 0;
let waveAnnouncement = { text: "", timer: 0, maxTimer: 180 };

let waveColors = [
  { bg: [0,  35, 10],  glow: '#00ff55' },
  { bg: [0,  20, 40],  glow: '#00cfff' },
  { bg: [5,  10, 55],  glow: '#4466ff' },
  { bg: [30,  0, 55],  glow: '#cc44ff' },
  { bg: [55,  0, 55],  glow: '#ff44ff' },
  { bg: [60, 25,  0],  glow: '#ff9900' },
  { bg: [65, 15,  0],  glow: '#ff5500' },
  { bg: [65,  0,  0],  glow: '#ff1111' },
];

let enemyList     = [];
let playerBullets = [];
let enemyBullets  = [];
let player        = {};

let enemyFireTimer = 0;
let shootCooldown  = 0;
let formationTimer = 0;


function setup() {
  let cnv = createCanvas(800, 500);
  document.getElementById("game-wrapper").appendChild(cnv.elt || cnv);

  // Persist high score between sessions
  highScore = parseInt(localStorage.getItem("stellarSiegeHighScore")) || 0;

  // Seed star field
  for (let i = 0; i < 120; i++) {
    stars.push({
      x:          random(0, 800),
      y:          random(0, 500),
      size:       random(1, 3),
      speed:      random(0.5, 2.5),
      brightness: random(150, 255)
    });
  }

  player = { x: 80, y: height / 2, w: 64, h: 44 };
  updateBorderColor();
}


function draw() {
  let wc = waveColors[Math.min(currentWave - 1, waveColors.length - 1)];
  background(wc.bg[0], wc.bg[1], wc.bg[2]);

  drawStars();

  if (gameState === "title") {
    showTitleScreen();
  } else if (gameState === "play") {
    runGameplay();
  } else if (gameState === "over") {
    showGameOverScreen();
  }

 
  if (screenFlashTimer > 0) {
    push();
    noStroke();
    fill(255, 0, 0, map(screenFlashTimer, 0, 20, 0, 130));
    rectMode(CORNER);
    rect(0, 0, width, height);
    pop();
    screenFlashTimer--;
  }
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    s.x -= s.speed;
    if (s.x < 0) {
      s.x = width + 2;
      s.y = random(0, height);
    }
    fill(s.brightness, s.brightness, s.brightness);
    circle(s.x, s.y, s.size);
  }
}


function showTitleScreen() {
  noStroke();
  fill("white");
  textAlign(CENTER);
  textSize(48);
  text("STELLAR SIEGE", width / 2, 180);
  textSize(16);
  text("High Score: " + highScore, width / 2, 240);
  if (frameCount % 60 < 30) {
    text("PRESS ENTER TO PLAY", width / 2, 310);
  }
}


function showGameOverScreen() {
  noStroke();
  fill("red");
  textAlign(CENTER);
  textSize(48);
  text("GAME OVER", width / 2, 180);
  fill("white");
  textSize(20);
  text("Score: " + score, width / 2, 260);
  text("Wave reached: " + currentWave, width / 2, 295);
  textSize(16);
  if (frameCount % 60 < 30) {
    text("PRESS ENTER TO RESTART", width / 2, 360);
  }
}


function runGameplay() {
  tickWaveTimer();
  movePlayer();
  handlePlayerShooting();
  spawnFormation();
  moveEnemiesAndShoot();
  moveBullets();
  updateBomb();
  checkCollisions();
  updateAndDrawExplosions();
  drawEnemies();
  drawPlayer();
  drawHUD();
  drawWaveAnnouncement();
}


function tickWaveTimer() {
  waveTimer++;
  if (waveTimer >= waveTimerMax) {
    waveTimer = 0;
    currentWave++;
    updateBorderColor();
    triggerWaveAnnouncement();
  }
}


function triggerWaveAnnouncement() {
  waveAnnouncement.text  = "WAVE " + currentWave;
  waveAnnouncement.timer = waveAnnouncement.maxTimer;
}


function drawWaveAnnouncement() {
  if (waveAnnouncement.timer <= 0) return;

  let t   = waveAnnouncement.timer;
  let max = waveAnnouncement.maxTimer;
  let alpha;

  if (t > max - 40) {
    alpha = map(t, max, max - 40, 0, 255);  // fade in
  } else if (t < 40) {
    alpha = map(t, 40, 0, 255, 0);           // fade out
  } else {
    alpha = 255;
  }

  push();
  noStroke();
  textAlign(CENTER);
  textSize(64);
  fill(255, 255, 80, alpha);
  text(waveAnnouncement.text, width / 2, height / 2 + 22);
  pop();

  waveAnnouncement.timer--;
}


function drawPlayer() {
  push();
  translate(player.x, player.y);
  noStroke();


  fill(255, 140, 0);
  triangle(-28, -3, -38, -14, -20, -3);
  triangle(-28,  3, -38,  14, -20,  3);

  // Wings
  fill(0, 100, 200);
  triangle(-12, -8, -20, -24,  14, -8);
  triangle(-12,  8, -20,  24,  14,  8);

  // Fuselage
  fill(20, 155, 255);
  rectMode(CENTER);
  rect(0, 0, 46, 16);

  // Nose cone
  triangle(23, -8, 23, 8, 36, 0);

  // Cockpit window
  fill(0, 50, 140);
  ellipse(5, 0, 17, 11);

  // Cockpit highlight
  fill(120, 210, 255, 160);
  ellipse(3, -2, 9, 5);

  pop();
}


function drawEnemySprite(e) {
  push();
  translate(e.x, e.y);
  noStroke();

  fill(255, 80, 255);
  triangle(26, -3, 36, -12, 20, -3);
  triangle(26,  3, 36,  12, 20,  3);

  // Wings
  fill(130, 20, 130);
  triangle(12, -7, 20, -22, -10, -7);
  triangle(12,  7, 20,  22, -10,  7);

  // Body
  fill(190, 30, 190);
  rectMode(CENTER);
  rect(0, 0, 42, 14);

  // Nose cone (pointing left)
  triangle(-21, -7, -21, 7, -33, 0);

  // Cockpit
  fill(255, 100, 255);
  ellipse(-4, 0, 14, 9);

  pop();
}


function drawEnemies() {
  for (let e of enemyList) drawEnemySprite(e);
}

function movePlayer() {
  let speed = 4;
  if (kb.pressing("up")   || kb.pressing("w")) player.y -= speed;
  if (kb.pressing("down") || kb.pressing("s")) player.y += speed;
  player.y = constrain(player.y, 20, height - 20);
}


function handlePlayerShooting() {
  if (shootCooldown > 0) shootCooldown--;

  bulletRecharge++;
  if (bulletRecharge >= bulletRechargeInterval) {
    bulletRecharge = 0;
    if (bulletsRemaining < 25) bulletsRemaining++;
  }

  if (kb.pressing("space") && shootCooldown === 0 && bulletsRemaining > 0) {
    playerBullets.push({ x: player.x + 36, y: player.y, w: 14, h: 5 });
    shootCooldown    = 15;
    bulletsRemaining--;
  }
}


function spawnFormation() {
  formationTimer++;
  let interval = Math.max(90, 350 - currentWave * 35);
  if (formationTimer < interval) return;
  formationTimer = 0;

  let type  = Math.floor(random(2)); 
  let baseY = random(90, height - 90);
  let sx    = width + 30;

  if (type === 0) {
    let count   = 4 + Math.floor(random(2));
    let spacing = Math.min(70, (height - 120) / count);
    let startY  = height / 2 - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      addEnemy(sx + i * 20, startY + i * spacing);
    }
  } else {
  
    let offsets = [
      { dx:  0, dy:  0  },
      { dx: 45, dy: -38 },
      { dx: 45, dy:  38 },
      { dx: 90, dy: -76 },
      { dx: 90, dy:  76 },
    ];
    for (let o of offsets) {
      addEnemy(sx + o.dx, constrain(baseY + o.dy, 50, height - 50));
    }
  }
}


function addEnemy(x, y) {
  enemyList.push({ x, y, w: 64, h: 44 });
}


function moveEnemiesAndShoot() {
  let enemySpeed   = 0.5 + currentWave * 0.3;
  let fireInterval = Math.max(40, 150 - currentWave * 10);

  enemyFireTimer++;

  for (let i = enemyList.length - 1; i >= 0; i--) {
    let e = enemyList[i];
    e.x -= enemySpeed;

    if (e.x < -40) {
      createExplosion(e.x + 50, e.y);
      enemyList.splice(i, 1);
      shieldHP--;
      checkShieldDepleted();
      continue;
    }

    if (enemyFireTimer >= fireInterval) {
      enemyBullets.push({ x: e.x - 24, y: e.y, w: 12, h: 5 });
    }
  }

  if (enemyFireTimer >= fireInterval) enemyFireTimer = 0;
}

function moveBullets() {
  noStroke();
  rectMode(CENTER);

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];
    b.x += 8;
    fill(255, 255, 0);
    rect(b.x, b.y, b.w, b.h);
    if (b.x > width + 20) playerBullets.splice(i, 1);
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let b = enemyBullets[i];
    b.x -= 6;
    fill(255, 100, 0);
    rect(b.x, b.y, b.w, b.h);
    if (b.x < -20) enemyBullets.splice(i, 1);
  }
}


function useBomb() {
  if (bombCount <= 0 || activeBomb !== null) return;
  bombCount--;
  enemyBullets = [];
  activeBomb = { x: player.x + 30, y: player.y, speed: 14, trail: [] };
}


function updateBomb() {
  if (!activeBomb) return;

  activeBomb.trail.push({ x: activeBomb.x, y: activeBomb.y });
  if (activeBomb.trail.length > 14) activeBomb.trail.shift();

  activeBomb.x += activeBomb.speed;

  for (let i = enemyList.length - 1; i >= 0; i--) {
    let e = enemyList[i];
    if (dist(activeBomb.x, activeBomb.y, e.x, e.y) < 80) {
      createExplosion(e.x, e.y);
      enemyList.splice(i, 1);
      score += 100;
    }
  }

  noStroke();
  for (let i = 0; i < activeBomb.trail.length; i++) {
    let alpha = map(i, 0, activeBomb.trail.length, 0, 180);
    fill(255, 160, 0, alpha);
    circle(activeBomb.trail[i].x, activeBomb.trail[i].y, 10);
  }

  stroke(255, 220, 50);
  strokeWeight(2);
  fill(255, 80, 0);
  circle(activeBomb.x, activeBomb.y, 22);
  noStroke();

  if (activeBomb.x > width + 40) {
    for (let e of enemyList) createExplosion(e.x, e.y);
    enemyList  = [];
    score     += 200;
    activeBomb = null;
  }
}


function checkCollisions() {
  for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
    let b = playerBullets[bi];
    for (let ei = enemyList.length - 1; ei >= 0; ei--) {
      let e = enemyList[ei];
      if (rectOverlap(b, e)) {
        createExplosion(e.x, e.y);
        playerBullets.splice(bi, 1);
        enemyList.splice(ei, 1);
        score += 100;
        break;
      }
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let b = enemyBullets[i];
    if (rectOverlap(b, player)) {
      enemyBullets.splice(i, 1);
      shieldHP--;
      screenFlashTimer = 20;  // trigger red flash
      checkShieldDepleted();
    }
  }
}


function rectOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) < (a.h + b.h) / 2
  );
}


function checkShieldDepleted() {
  if (shieldHP <= 0) {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("stellarSiegeHighScore", highScore);
    }
    gameState = "over";
  }
}



function createExplosion(x, y) {
  for (let i = 0; i < 8; i++) {
    let angle = (Math.PI * 2 / 8) * i;
    let speed = random(1.5, 4);
    explosions.push({
      x, y,
      vx:      Math.cos(angle) * speed,
      vy:      Math.sin(angle) * speed,
      life:    30,
      maxLife: 30,
      size:    random(4, 9)
    });
  }
}


function updateAndDrawExplosions() {
  noStroke();
  for (let i = explosions.length - 1; i >= 0; i--) {
    let p = explosions[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    let alpha = map(p.life, 0, p.maxLife, 0, 255);
    let g     = map(p.life, 0, p.maxLife, 0, 180);
    fill(255, g, 0, alpha);
    circle(p.x, p.y, p.size);
    if (p.life <= 0) explosions.splice(i, 1);
  }
}


function drawHUD() {
  push();
  fill("white");
  noStroke();
  textAlign(LEFT);

  let secondsLeft = Math.ceil((waveTimerMax - waveTimer) / 60);

  textSize(16);
  text("Score: "     + score,                      10, 25);
  text("Wave:  "     + currentWave,                10, 48);
  text("Next wave: " + secondsLeft + "s",          10, 71);
  text("Ammo: "      + bulletsRemaining + " / 25", 10, 94);
  text("Bombs: "     + "💣".repeat(Math.max(0, bombCount)), 10, 117);
  text("Shield: "    + "♥ ".repeat(Math.max(0, shieldHP)),  10, height - 10);
  pop();
}


function updateBorderColor() {
  let wc      = waveColors[Math.min(currentWave - 1, waveColors.length - 1)];
  let wrapper = document.getElementById("game-wrapper");
  if (!wrapper) return;
  wrapper.style.borderColor = wc.glow;
  wrapper.style.boxShadow   =
    `0 0 18px ${wc.glow}, 0 0 55px ${wc.glow}66, inset 0 0 18px ${wc.glow}22`;
}


function keyPressed() {
  if ((key === "b" || key === "B") && gameState === "play") {
    useBomb();
  }

  if (key === "Enter") {
    if (gameState === "title") {
      gameState = "play";
      triggerWaveAnnouncement();
    } else if (gameState === "over") {
      score            = 0;
      currentWave      = 1;
      shieldHP         = 3;
      bulletsRemaining = 25;
      bulletRecharge   = 0;
      waveTimer        = 0;
      bombCount        = 3;
      enemyFireTimer   = 0;
      formationTimer   = 0;
      explosions       = [];
      activeBomb       = null;
      enemyList        = [];
      playerBullets    = [];
      enemyBullets     = [];
      player.x         = 80;
      player.y         = height / 2;
      screenFlashTimer = 0;
      gameState        = "play";
      updateBorderColor();
      triggerWaveAnnouncement();
    }
  }
}