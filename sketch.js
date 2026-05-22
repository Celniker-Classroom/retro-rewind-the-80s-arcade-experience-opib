const q = new Q5();

let gameState = "title";

// score holders
let score = 0;
let highScore = 0;
let currentWave = 1;
let shieldHP = 3;
let bulletsRemaining = 25;
let bulletRecharge = 0;
let bulletRechargeInterval = 144;

// wave timer
let waveTimer = 0;
let waveTimerMax = 1200;

// bomb
let bombCount = 3;
let activeBomb = null;

// explosions
let explosions = [];

// wave colors
let waveColors = [
  { bg: [0,  35, 10],  glow: '#00ff55' },  // Wave 1: Green
  { bg: [0,  20, 40],  glow: '#00cfff' },  // Wave 2: Cyan
  { bg: [5,  10, 55],  glow: '#4466ff' },  // Wave 3: Blue
  { bg: [30,  0, 55],  glow: '#cc44ff' },  // Wave 4: Purple
  { bg: [55,  0, 55],  glow: '#ff44ff' },  // Wave 5: Magenta
  { bg: [60, 25,  0],  glow: '#ff9900' },  // Wave 6: Orange
  { bg: [65, 15,  0],  glow: '#ff5500' },  // Wave 7: Red-Orange
  { bg: [65,  0,  0],  glow: '#ff1111' },  // Wave 8+: Red
];

//sprites 

let playerImg;
let enemyImg;

let enemyList      = [];
let playerBullets  = [];
let enemyBullets   = [];

let player = {};

let enemySpawnTimer = 0;
let enemyFireTimer  = 0;
let shootCooldown   = 0;


q.preload = function() {
  playerImg = q.loadImage("player.png");
  enemyImg  = q.loadImage("enemy.png");
};

q.setup = function() {
  let cnv = q.createCanvas(800, 500);
  cnv.parent("game-wrapper");

  // player sprite
  player = {
    x:      80,
    y:      q.height / 2,
    w:      playerImg.width  * 0.5,
    h:      playerImg.height * 0.5,
    img:    playerImg
  };

  updateBorderColor();
};

q.draw = function() {
  let wc = waveColors[Math.min(currentWave - 1, waveColors.length - 1)];
  q.background(wc.bg[0], wc.bg[1], wc.bg[2]);

  if (gameState === "title") {
    showTitleScreen();
  } else if (gameState === "play") {
    runGameplay();
  } else if (gameState === "over") {
    showGameOverScreen();
  }
};

//title screen
function showTitleScreen() {
  q.fill("white");
  q.textAlign(q.CENTER);
  q.textSize(48);
  q.text("STELLAR SIEGE", q.width / 2, 180);
  q.textSize(16);
  q.text("High Score: " + highScore, q.width / 2, 240);
  if (q.frameCount % 60 < 30) {
    q.text("PRESS ENTER TO PLAY", q.width / 2, 310);
  }
}

function showGameOverScreen() {
  q.fill("red");
  q.textAlign(q.CENTER);
  q.textSize(48);
  q.text("GAME OVER", q.width / 2, 180);
  q.fill("white");
  q.textSize(20);
  q.text("Score: " + score, q.width / 2, 260);
  q.text("Wave reached: " + currentWave, q.width / 2, 295);
  q.textSize(16);
  if (q.frameCount % 60 < 30) {
    q.text("PRESS ENTER TO RESTART", q.width / 2, 360);
  }
}

function runGameplay() {
  tickWaveTimer();
  movePlayer();
  handlePlayerShooting();
  spawnEnemies();
  moveEnemiesAndShoot();
  moveBullets();
  updateBomb();
  checkCollisions();
  updateAndDrawExplosions();
  drawPlayer();
  drawEnemies();
  drawHUD();
}

function tickWaveTimer() {
  waveTimer++;
  if (waveTimer >= waveTimerMax) {
    waveTimer = 0;
    currentWave++;
    updateBorderColor();
  }
}


function drawPlayer() {
  q.imageMode(q.CENTER);
  q.image(player.img, player.x, player.y, player.w, player.h);
}

function drawEnemies() {
  q.imageMode(q.CENTER);
  for (let e of enemyList) {
    q.image(e.img, e.x, e.y, e.w, e.h);
  }
}

function movePlayer() {
  let speed = 4;
  if (q.kb.pressing("up")   || q.kb.pressing("w")) player.y -= speed;
  if (q.kb.pressing("down") || q.kb.pressing("s")) player.y += speed;
  player.y = q.constrain(player.y, 20, q.height - 20);
}

function handlePlayerShooting() {
  if (shootCooldown > 0) shootCooldown--;

  // Recharge one bullet every 288 frames
  bulletRecharge++;
  if (bulletRecharge >= bulletRechargeInterval) {
    bulletRecharge = 0;
    if (bulletsRemaining < 25) bulletsRemaining++;
  }

  if (q.kb.pressing("space") && shootCooldown === 0 && bulletsRemaining > 0) {
    playerBullets.push({
      x: player.x + player.w / 2,
      y: player.y,
      w: 14,
      h: 5
    });
    shootCooldown = 15;
    bulletsRemaining--;
  }
}

//bomb (msg to odin: new feature)
function useBomb() {
  if (bombCount <= 0 || activeBomb !== null) return;
  bombCount--;
  enemyBullets = []; 

  activeBomb = {
    x:     player.x + 30,
    y:     player.y,
    speed: 14,
    trail: []
  };
}

function updateBomb() {
  if (!activeBomb) return;

 
  activeBomb.trail.push({ x: activeBomb.x, y: activeBomb.y });
  if (activeBomb.trail.length > 14) activeBomb.trail.shift();

  activeBomb.x += activeBomb.speed;


  for (let i = enemyList.length - 1; i >= 0; i--) {
    let e = enemyList[i];
    if (q.dist(activeBomb.x, activeBomb.y, e.x, e.y) < 80) {
      createExplosion(e.x, e.y);
      enemyList.splice(i, 1);
      score += 100;
    }
  }


  q.noStroke();
  for (let i = 0; i < activeBomb.trail.length; i++) {
    let alpha = q.map(i, 0, activeBomb.trail.length, 0, 180);
    q.fill(255, 160, 0, alpha);
    q.circle(activeBomb.trail[i].x, activeBomb.trail[i].y, 10);
  }


  q.stroke(255, 220, 50);
  q.strokeWeight(2);
  q.fill(255, 80, 0);
  q.circle(activeBomb.x, activeBomb.y, 22);
  q.noStroke();


  if (activeBomb.x > q.width + 40) {
    for (let e of enemyList) createExplosion(e.x, e.y);
    enemyList = [];
    score += 200;
    activeBomb = null;
  }
}

function spawnEnemies() {
  enemySpawnTimer++;

  let baseInterval  = Math.max(20, 120 - (currentWave * 15));
  let scaleFactor   = Math.max(1.0, 2.0 - (currentWave - 1) * 0.25);
  let spawnInterval = Math.floor(baseInterval * scaleFactor);

  if (enemySpawnTimer >= spawnInterval) {
    enemySpawnTimer = 0;
    enemyList.push({
      x:   q.width + 20,
      y:   q.random(40, q.height - 40),
      w:   enemyImg.width  * 0.4,
      h:   enemyImg.height * 0.4,
      img: enemyImg
    });
  }
}

//enemies movement 

function moveEnemiesAndShoot() {
  let enemySpeed   = 0.5 + (currentWave * 0.3);
  let fireInterval = Math.max(40, 150 - (currentWave * 10));

  enemyFireTimer++;

  for (let i = enemyList.length - 1; i >= 0; i--) {
    let e = enemyList[i];
    e.x -= enemySpeed;


    if (e.x < 0) {
      createExplosion(e.x + 10, e.y);
      enemyList.splice(i, 1);
      shieldHP--;
      checkShieldDepleted();
      continue;
    }

  
    if (enemyFireTimer >= fireInterval) {
      enemyBullets.push({
        x: e.x - 20,
        y: e.y,
        w: 12,
        h: 5
      });
    }
  }

  if (enemyFireTimer >= fireInterval) enemyFireTimer = 0;
}

function moveBullets() {
  q.noStroke();

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];
    b.x += 8;
    q.fill("yellow");
    q.rectMode(q.CENTER);
    q.rect(b.x, b.y, b.w, b.h);
    if (b.x > q.width + 20) playerBullets.splice(i, 1);
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let b = enemyBullets[i];
    b.x -= 6;
    q.fill("orange");
    q.rectMode(q.CENTER);
    q.rect(b.x, b.y, b.w, b.h);
    if (b.x < -20) enemyBullets.splice(i, 1);
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
    if (score > highScore) highScore = score;
    gameState = "over";
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 8; i++) {
    let angle = (Math.PI * 2 / 8) * i;
    let speed = q.random(1.5, 4);
    explosions.push({
      x, y,
      vx:      Math.cos(angle) * speed,
      vy:      Math.sin(angle) * speed,
      life:    30,
      maxLife: 30,
      size:    q.random(4, 9)
    });
  }
}

function updateAndDrawExplosions() {
  q.noStroke();
  for (let i = explosions.length - 1; i >= 0; i--) {
    let p = explosions[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    let alpha = q.map(p.life, 0, p.maxLife, 0, 255);
    let g     = q.map(p.life, 0, p.maxLife, 0, 180);
    q.fill(255, g, 0, alpha);
    q.circle(p.x, p.y, p.size);
    if (p.life <= 0) explosions.splice(i, 1);
  }
}


function updateBorderColor() {
  let wc      = waveColors[Math.min(currentWave - 1, waveColors.length - 1)];
  let wrapper = document.getElementById("game-wrapper");
  if (!wrapper) return;
  wrapper.style.borderColor = wc.glow;
  wrapper.style.boxShadow   =
    `0 0 18px ${wc.glow}, 0 0 55px ${wc.glow}66, inset 0 0 18px ${wc.glow}22`;
}


function drawHUD() {
  q.fill("white");
  q.noStroke();
  q.textAlign(q.LEFT);

  let secondsLeft = Math.ceil((waveTimerMax - waveTimer) / 60);

  q.textSize(16);
  q.text("Score: "     + score,                    10, 25);
  q.text("Wave:  "     + currentWave,               10, 48);
  q.text("Next wave: " + secondsLeft + "s",         10, 71);
  q.text("Ammo: "      + bulletsRemaining + " / 25",10, 94);
  q.text("Bombs: "     + "💣".repeat(Math.max(0, bombCount)), 10, 117);
  q.text("Shield: "    + "♥ ".repeat(Math.max(0, shieldHP)),  10, q.height - 10);
}

q.keyPressed = function() {
  if (q.key === "b" || q.key === "B") {
    if (gameState === "play") useBomb();
  }

  if (q.key === "Enter") {
    if (gameState === "title") {
      gameState = "play";
    } else if (gameState === "over") {
      score            = 0;
      currentWave      = 1;
      shieldHP         = 3;
      bulletsRemaining = 25;
      bulletRecharge   = 0;
      waveTimer        = 0;
      bombCount        = 3;
      enemySpawnTimer  = 0;
      enemyFireTimer   = 0;
      explosions       = [];
      activeBomb       = null;
      enemyList        = [];
      playerBullets    = [];
      enemyBullets     = [];
      player.x         = 80;
      player.y         = q.height / 2;
      gameState        = "play";
      updateBorderColor();
    }
  }
};