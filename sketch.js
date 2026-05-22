let gameState = "title";

// Scores
let score = 0;
let highScore = 0;
let currentWave = 1;
let shieldHP = 3;
let bulletsRemaining = 25;
let bulletRecharge = 0;
let bulletRechargeInterval = 144;

let waveTimer = 0;
let waveTimerMax = 1200;

// Bombs
let bombCount = 3;
let activeBomb = null;

// Explosions
let explosions = [];

// wave colors for different parts of the game
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

// Sprites
let playerImg;
let enemyImg;
let enemies;
let playerBullets;
let enemyBullets;

let enemySpawnTimer = 0;
let enemyFireTimer  = 0;


function preload() {
  playerImg = loadImage("player.png");
  enemyImg  = loadImage("enemy.png");
}


function setup() {
  let cnv = createCanvas(800, 500);
  cnv.parent('game-wrapper');

  enemies       = new Group();
  playerBullets = new Group();
  enemyBullets  = new Group();

  player              = new Sprite();
  player.scale        = 0.5;
  player.image        = playerImg;
  player.x            = 80;
  player.y            = height / 2;
  player.collider     = "dynamic";
  player.gravityScale = 0;

  updateBorderColor();
}


function draw() {
  let wc = waveColors[min(currentWave - 1, waveColors.length - 1)];
  background(wc.bg[0], wc.bg[1], wc.bg[2]);

  if (gameState === "title") {
    showTitleScreen();
  } else if (gameState === "play") {
    runGameplay();
  } else if (gameState === "over") {
    showGameOverScreen();
  }
}


function showTitleScreen() {
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
  spawnEnemies();
  moveEnemiesAndShoot();
  moveBullets();
  updateBomb();
  checkCollisions();
  updateAndDrawExplosions();
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


function movePlayer() {
  let speed = 4;
  if (kb.pressing("up")   || kb.pressing("w")) player.y -= speed;
  if (kb.pressing("down") || kb.pressing("s")) player.y += speed;
  player.y = constrain(player.y, 20, height - 20);
}


let shootCooldown = 0;

function handlePlayerShooting() {
  if (shootCooldown > 0) shootCooldown--;

  bulletRecharge++;
  if (bulletRecharge >= bulletRechargeInterval) {
    bulletRecharge = 0;
    if (bulletsRemaining < 25) bulletsRemaining++;
  }

  if (kb.pressing("space") && shootCooldown === 0 && bulletsRemaining > 0) {
    let b          = new playerBullets.Sprite();
    b.x            = player.x + 25;
    b.y            = player.y;
    b.w            = 14;
    b.h            = 5;
    b.color        = "yellow";
    b.collider     = "dynamic";
    b.gravityScale = 0;
    shootCooldown  = 15;
    bulletsRemaining--;
  }
}


function useBomb() {
  if (bombCount <= 0 || activeBomb !== null) return;
  bombCount--;

  enemyBullets.removeAll();

  activeBomb = {
    x: player.x + 30,
    y: player.y,
    speed: 14,
    trail: []
  };
}


function updateBomb() {
  if (!activeBomb) return;

  // Build trail
  activeBomb.trail.push({ x: activeBomb.x, y: activeBomb.y });
  if (activeBomb.trail.length > 14) activeBomb.trail.shift();

  activeBomb.x += activeBomb.speed;

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    if (dist(activeBomb.x, activeBomb.y, e.x, e.y) < 80) {
      createExplosion(e.x, e.y);
      e.remove();
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

  // Off-screen: clear anything the bomb missed, award bonus
  if (activeBomb.x > width + 40) {
    for (let e of enemies) createExplosion(e.x, e.y);
    enemies.removeAll();
    score += 200;
    activeBomb = null;
  }
}

function spawnEnemies() {
  enemySpawnTimer++;

  let baseInterval = max(20, 120 - (currentWave * 15));
  // Wave 1 = 2× interval (half the enemies). Ramps to full speed by wave 5.
  let scaleFactor  = max(1.0, 2.0 - (currentWave - 1) * 0.25);
  let spawnInterval = Math.floor(baseInterval * scaleFactor);

  if (enemySpawnTimer >= spawnInterval) {
    enemySpawnTimer = 0;

    let e          = new enemies.Sprite();
    e.x            = width + 20;
    e.y            = random(40, height - 40);
    e.scale        = 0.4;
    e.image        = enemyImg;
    e.collider     = "dynamic";
    e.gravityScale = 0;
  }
}

function moveEnemiesAndShoot() {
  let enemySpeed   = 0.5 + (currentWave * 0.3);
  let fireInterval = max(40, 150 - (currentWave * 10));

  enemyFireTimer++;

  for (let e of enemies) {
    e.x -= enemySpeed;

    if (e.x < 0) {
      createExplosion(e.x + 10, e.y);
      e.remove();
      shieldHP--;
      checkShieldDepleted();
    }

    if (enemyFireTimer >= fireInterval) {
      let b          = new enemyBullets.Sprite();
      b.x            = e.x - 20;
      b.y            = e.y;
      b.w            = 12;
      b.h            = 5;
      b.color        = "orange";
      b.collider     = "dynamic";
      b.gravityScale = 0;
    }
  }

  if (enemyFireTimer >= fireInterval) enemyFireTimer = 0;
}

function moveBullets() {
  for (let b of playerBullets) {
    b.x += 8;
    if (b.x > width + 20) b.remove();
  }

  for (let b of enemyBullets) {
    b.x -= 6;
    if (b.x < -20) b.remove();
  }
}

function checkCollisions() {
  playerBullets.overlaps(enemies, (bullet, enemy) => {
    createExplosion(enemy.x, enemy.y);
    bullet.remove();
    enemy.remove();
    score += 100;
  });

  enemyBullets.overlaps(player, (bullet, p) => {
    bullet.remove();
    shieldHP--;
    checkShieldDepleted();
  });
}

function checkShieldDepleted() {
  if (shieldHP <= 0) {
    if (score > highScore) highScore = score;
    gameState = "over";
  }
}

function createExplosion(x, y) {
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i;
    let speed = random(1.5, 4);
    explosions.push({
      x, y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 30, maxLife: 30,
      size: random(4, 9)
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

function updateBorderColor() {
  let wc = waveColors[min(currentWave - 1, waveColors.length - 1)];
  let wrapper = document.getElementById('game-wrapper');
  if (!wrapper) return;
  wrapper.style.borderColor = wc.glow;
  wrapper.style.boxShadow =
    `0 0 18px ${wc.glow}, 0 0 55px ${wc.glow}66, inset 0 0 18px ${wc.glow}22`;
}

function drawHUD() {
  fill("white");
  noStroke();
  textAlign(LEFT);

  let secondsLeft = Math.ceil((waveTimerMax - waveTimer) / 60);

  textSize(16);
  text("Score: "      + score,               10, 25);
  text("Wave:  "      + currentWave,          10, 48);
  text("Next wave: "  + secondsLeft + "s",    10, 71);
  text("Ammo: "       + bulletsRemaining + " / 25", 10, 94);
  text("Bombs: "      + "💣".repeat(max(0, bombCount)), 10, 117);
  text("Shield: "     + "♥ ".repeat(max(0, shieldHP)), 10, height - 10);
}

function keyPressed() {
  if (key === "b" || key === "B") {
    if (gameState === "play") useBomb();
  }

  if (key === "Enter") {
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
      enemies.removeAll();
      playerBullets.removeAll();
      enemyBullets.removeAll();
      player.x  = 80;
      player.y  = height / 2;
      gameState = "play";
      updateBorderColor();
    }
  }
}