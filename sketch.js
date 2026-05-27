new Q5("global");

let playerImg = new Image();
playerImg.src = "image.png";

let gameState = "title";

let score            = 0;
let highScore        = 0;
let currentWave      = 1;
let shieldHP         = 3;
let bulletsRemaining = 25;
let bulletRecharge   = 0;
let bulletRechargeInterval = 58;

let waveTimer    = 0;
let waveTimerMax = 1200;

let bombCount  = 3;
let activeBomb = null;
let explosions = [];

// stars, flash, wave announcement
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

let shootCooldown  = 0;
let formationTimer = 0;
let pressedKeys = {};
let gfx;

// Boss
let boss = null;

// Powerups
let powerups       = [];
let rapidFireTimer = 0;


function setup() {
  let cnv = createCanvas(800, 500);
  let canvasElt = cnv.elt || cnv;
  document.getElementById("game-wrapper").appendChild(canvasElt);
  gfx = canvasElt.getContext("2d");

  // persist high score between sessions
  highScore = parseInt(localStorage.getItem("stellarSiegeHighScore")) || 0;

  // seed star field
  for (let i = 0; i < 120; i++) {
    stars.push({
      x:          random(0, 800),
      y:          random(0, 500),
      size:       random(1, 3),
      speed:      random(0.5, 2.5),
      brightness: random(150, 255)
    });
  }

  // hitbox
  player = { x: 80, y: height / 2, w: 64, h: 44, drawW: 131, drawH: 90 };
  updateBorderColor();
}

function draw() {
  let wc = waveColors[Math.min(currentWave - 1, waveColors.length - 1)];
  background(wc.bg[0], wc.bg[1], wc.bg[2]);

  drawStars();

  if (gameState === "title") {
    showTitleScreen();
  } else if (gameState === "howto") {
    showHowToScreen();
  } else if (gameState === "inspiration") {
    showInspirationScreen();
  } else if (gameState === "play") {
    runGameplay();
  } else if (gameState === "over") {
    showGameOverScreen();
  }

  // red flash when hit
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

// stars spawning
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

// screens
function showTitleScreen() {
  push();
  noStroke();
  fill(255, 255, 255);
  textAlign(CENTER);
  textSize(48);
  text("STELLAR SIEGE", width / 2, 180);
  textSize(16);
  text("High Score: " + highScore, width / 2, 240);
  if (frameCount % 60 < 30) {
    text("PRESS ENTER TO PLAY", width / 2, 310);
  }

  // HOW TO PLAY button — right side of screen
  let btnX = 576, btnY = 360, btnW = 178, btnH = 42;
  fill(0, 45, 18, 210);
  stroke(0, 200, 100);
  strokeWeight(2);
  rectMode(CENTER);
  rect(btnX, btnY, btnW, btnH, 7);
  noStroke();
  fill(0, 220, 110);
  textSize(15);
  text("HOW TO PLAY", btnX, btnY + 6);

  let insX = 576, insY = 412, insW = 178, insH = 42;
  fill(0, 25, 50, 210);
  stroke(0, 150, 220);
  strokeWeight(2);
  rectMode(CENTER);
  rect(insX, insY, insW, insH, 7);
  noStroke();
  fill(0, 180, 255);
  textSize(15);
  text("INSPIRATION", insX, insY + 6);
  pop();
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

// gameplay loop
function runGameplay() {
  tickWaveTimer();
  movePlayer();
  handlePlayerShooting();
  spawnFormation();
  moveEnemiesAndShoot();
  updateBoss();
  moveBullets();
  updateBomb();
  checkCollisions();
  updateAndDrawExplosions();
  updateAndDrawPowerups();
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
    if (currentWave % 5 === 0) spawnBoss();
  }
}

// wave anncouncements 
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

// sprite drawing 

function drawPlayer() {
  if (!playerImg.complete || playerImg.naturalWidth === 0) return;

  let c = gfx;
  c.save();
  c.translate(player.x, player.y);
  c.rotate(Math.PI / 2);  //rotate so ship faces right (original image faces up)
  c.drawImage(playerImg, -player.drawH / 2, -player.drawW / 2, player.drawH, player.drawW);
  c.restore();
}

function drawEnemySprite(e) {
  let c = gfx;
  c.save();
  c.translate(e.x, e.y);
  // thruster flames
  c.fillStyle = 'rgba(255,80,255,0.9)';
  c.beginPath(); c.moveTo(26,-3); c.lineTo(36,-12); c.lineTo(20,-3); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(26, 3); c.lineTo(36, 12); c.lineTo(20, 3); c.closePath(); c.fill();
  // wings
  c.fillStyle = 'rgb(130,20,130)';
  c.beginPath(); c.moveTo(12,-7); c.lineTo(20,-22); c.lineTo(-10,-7); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(12, 7); c.lineTo(20, 22); c.lineTo(-10, 7); c.closePath(); c.fill();
  // body
  c.fillStyle = 'rgb(190,30,190)';
  c.beginPath();
  c.moveTo(-33,0); c.lineTo(-14,-7); c.lineTo(22,-7);
  c.lineTo(26,-3); c.lineTo(26,3); c.lineTo(22,7); c.lineTo(-14,7);
  c.closePath(); c.fill();
  // cockpit
  c.fillStyle = 'rgb(255,100,255)';
  c.beginPath(); c.ellipse(-4, 0, 7, 5, 0, 0, Math.PI*2); c.fill();

  c.restore();
}

function drawEnemies() {
  for (let e of enemyList) drawEnemySprite(e);
}

// player movement and shooting
function movePlayer() {
  let speed = 4;
  if (pressedKeys["ArrowUp"]   || pressedKeys["w"] || pressedKeys["W"]) player.y -= speed;
  if (pressedKeys["ArrowDown"] || pressedKeys["s"] || pressedKeys["S"]) player.y += speed;
  player.y = constrain(player.y, 20, height - 20);
}

function handlePlayerShooting() {
  if (shootCooldown > 0) shootCooldown--;
  if (rapidFireTimer > 0) rapidFireTimer--;

  bulletRecharge++;
  if (bulletRecharge >= bulletRechargeInterval) {
    bulletRecharge = 0;
    if (bulletsRemaining < 25) bulletsRemaining++;
  }
  if (pressedKeys[" "] && shootCooldown === 0 && bulletsRemaining > 0) {
    playerBullets.push({ x: player.x + 36, y: player.y, w: 14, h: 5 });
    shootCooldown    = rapidFireTimer > 0 ? 7 : 15;
    bulletsRemaining--;
  }
}

// formation spawning 

function spawnFormation() {
  formationTimer++;
  let easyBonus = Math.max(0, (5 - currentWave) * 60);
  let interval  = Math.max(90, 350 - currentWave * 35 + easyBonus);
  if (formationTimer < interval) return;
  formationTimer = 0;

  let type  = Math.floor(random(2));  
  let baseY = random(90, height - 90);
  let sx    = width + 30;

  if (type === 0) {
    // staggered vertical column 
    let count   = 4 + Math.floor(random(2));
    let spacing = Math.min(70, (height - 120) / count);
    let startY  = height / 2 - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      addEnemy(sx + i * 20, startY + i * spacing);
    }
  } else {
    // v-formation for enemies
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
  let fi = Math.max(73, 273 - currentWave * 18);
  enemyList.push({
    x, y, w: 64, h: 44,
    fireTimer:    Math.floor(random(fi)),        // staggered start so they don't sync
    fireInterval: fi + Math.floor(random(-20, 20)) // small variance per enemy
  });
}

// enemy movement & shooting
function moveEnemiesAndShoot() {
  let enemySpeed = 0.5 + currentWave * 0.3;

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

    //each enemy fires independently
    e.fireTimer++;
    if (e.fireTimer >= e.fireInterval) {
      e.fireTimer = 0;
      enemyBullets.push({ x: e.x - 24, y: e.y, w: 12, h: 5 });
    }
  }
}

// bullets movement and rendering
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

// bomb tool
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

// collisions
function checkCollisions() {
  for (let bi = playerBullets.length - 1; bi >= 0; bi--) {
    let b = playerBullets[bi];

    // when bullets hit the boss
    if (boss && rectOverlap(b, boss)) {
      playerBullets.splice(bi, 1);
      boss.hp--;
      boss.hitFlash = 10;
      if (boss.hp <= 0) {
        createExplosion(boss.x,      boss.y);
        createExplosion(boss.x - 25, boss.y - 18);
        createExplosion(boss.x + 25, boss.y + 18);
        score += 500 + currentWave * 10;
        // boss always drops a powerup
        let drops = ["shield", "ammo", "rapidfire"];
        powerups.push({ x: boss.x, y: boss.y, type: drops[Math.floor(random(3))], w: 24, h: 24 });
        boss = null;
      }
      continue;
    }

    // when bullets hit normal enemies 
    for (let ei = enemyList.length - 1; ei >= 0; ei--) {
      let e = enemyList[ei];
      if (rectOverlap(b, e)) {
        createExplosion(e.x, e.y);
        tryDropPowerup(e.x, e.y);
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
      screenFlashTimer = 20;
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

// Explosions
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

// HUD and UI elements

function drawHUD() {
  push();
  fill(255, 255, 255);
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

  if (rapidFireTimer > 0) {
    textAlign(RIGHT);
    fill(255, 80, 80);
    text("🔥 RAPID FIRE " + Math.ceil(rapidFireTimer / 60) + "s", width - 10, 25);
  }
  pop();
}

// boss
function spawnBoss() {
  let hp = 4 + Math.floor(currentWave / 5);
  boss = {
    x: width + 70, y: height / 2,
    w: 110, h: 70,
    hp: hp, maxHP: hp,
    speed: 0.7,
    fireTimer: 0, fireInterval: 80,
    hitFlash: 0
  };
}

function updateBoss() {
  if (!boss) return;

  boss.x -= boss.speed;
  boss.y += Math.sin(frameCount * 0.03) * 0.8;
  boss.y  = constrain(boss.y, 60, height - 60);

  boss.fireTimer++;
  if (boss.fireTimer >= boss.fireInterval) {
    boss.fireTimer = 0;
    enemyBullets.push({ x: boss.x - 60, y: boss.y,      w: 16, h: 6 });
    enemyBullets.push({ x: boss.x - 60, y: boss.y - 24, w: 16, h: 6 });
    enemyBullets.push({ x: boss.x - 60, y: boss.y + 24, w: 16, h: 6 });
  }

  if (boss.x < -90) {
    shieldHP        -= 2;
    screenFlashTimer = 30;
    createExplosion(20, boss.y);
    boss = null;
    checkShieldDepleted();
    return;
  }

  // draw
  let c  = gfx;
  let bx = boss.x;
  let by = boss.y;

  // HP bar
  let barW = 90;
  let barX = bx - barW / 2;
  let barY = by - 62;
  c.fillStyle = 'rgba(40,0,0,0.85)';
  c.fillRect(barX, barY, barW, 9);
  c.fillStyle = 'rgb(255,50,50)';
  c.fillRect(barX, barY, barW * (boss.hp / boss.maxHP), 9);
  c.strokeStyle = 'rgb(255,120,120)';
  c.lineWidth = 1;
  c.strokeRect(barX, barY, barW, 9);

  c.save();
  c.translate(bx, by);

  // red glow 
  c.shadowColor = 'red';
  c.shadowBlur  = boss.hitFlash > 0 ? 45 : 22;

  // main body
  c.fillStyle = boss.hitFlash > 0 ? 'rgb(255,130,130)' : 'rgb(150,15,15)';
  c.beginPath();
  c.moveTo(-55,  0);
  c.lineTo(-32, -28); c.lineTo( 22, -34);
  c.lineTo( 52, -14); c.lineTo( 52,  14);
  c.lineTo( 22,  34); c.lineTo(-32,  28);
  c.closePath();
  c.fill();

  c.shadowBlur = 0;

  // spikes
  c.fillStyle = 'rgb(200,30,30)';
  c.beginPath(); c.moveTo(18,-34); c.lineTo(28,-54); c.lineTo(8,-34); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(18, 34); c.lineTo(28, 54); c.lineTo(8, 34); c.closePath(); c.fill();
  // engine core
  c.fillStyle = 'rgb(70,0,0)';
  c.beginPath(); c.ellipse(14, 0, 22, 16, 0, 0, Math.PI*2); c.fill();
  // reactor
  c.fillStyle = boss.hitFlash > 0 ? 'rgb(255,255,255)' : 'rgb(255,180,0)';
  c.beginPath(); c.ellipse(14, 0, 12, 9, 0, 0, Math.PI*2); c.fill();

  c.restore();

  if (boss.hitFlash > 0) boss.hitFlash--;
}

// powerups
function tryDropPowerup(x, y) {
  let r = random(1);
  if      (r < 0.01) powerups.push({ x, y, type: "bomb",      w: 24, h: 24 });  // 1%
  else if (r < 0.06) powerups.push({ x, y, type: "shield",    w: 24, h: 24 });  // 5%
  else if (r < 0.16) powerups.push({ x, y, type: "ammo",      w: 24, h: 24 });  // 10%
  else if (r < 0.26) powerups.push({ x, y, type: "rapidfire", w: 24, h: 24 });  // 10%
}

function applyPowerup(type) {
  if      (type === "shield")    shieldHP = Math.min(shieldHP + 1, 5);
  else if (type === "ammo")    { bulletsRemaining = 25; bulletRecharge = 0; }
  else if (type === "rapidfire") rapidFireTimer = 600;
  else if (type === "bomb")      bombCount = Math.min(bombCount + 1, 5);
}

function updateAndDrawPowerups() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    p.x -= 1.5;

    if (p.x < -30) { powerups.splice(i, 1); continue; }

    if (rectOverlap(p, player)) {
      applyPowerup(p.type);
      powerups.splice(i, 1);
      continue;
    }

    // glow halo
    push();
    noStroke();
    if      (p.type === "shield")    fill(0,   210, 80,  90);
    else if (p.type === "ammo")      fill(255, 220, 0,   90);
    else if (p.type === "rapidfire") fill(255, 50,  50,  90);
    else                             fill(160, 100, 30,  90);  // bomb — amber
    circle(p.x, p.y, 30);

    // icons
    textAlign(CENTER);
    textSize(17);
    fill(255, 255, 255);
    let icon = p.type === "shield" ? "♥"
             : p.type === "ammo"   ? "⚡"
             : p.type === "rapidfire" ? "🔥"
             : "💣";
    text(icon, p.x, p.y + 6);
    pop();
  }
}

// boarder glow
function updateBorderColor() {
  let wc      = waveColors[Math.min(currentWave - 1, waveColors.length - 1)];
  let wrapper = document.getElementById("game-wrapper");
  if (!wrapper) return;
  wrapper.style.borderColor = wc.glow;
  wrapper.style.boxShadow   =
    `0 0 18px ${wc.glow}, 0 0 55px ${wc.glow}66, inset 0 0 18px ${wc.glow}22`;
}

// inputs
function keyPressed() {
  pressedKeys[key] = true;

  if ((key === "b" || key === "B") && gameState === "play") {
    useBomb();
  }

  if (key === "Enter") {
    if (gameState === "title") {
      gameState = "play";
      triggerWaveAnnouncement();
    } else if (gameState === "howto") {
      gameState = "play";
      triggerWaveAnnouncement();
    } else if (gameState === "inspiration") {
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
      formationTimer   = 0;
      explosions       = [];
      activeBomb       = null;
      enemyList        = [];
      playerBullets    = [];
      enemyBullets     = [];
      player.x         = 80;
      player.y         = height / 2;
      screenFlashTimer = 0;
      powerups         = [];
      rapidFireTimer   = 0;
      boss             = null;
      gameState        = "play";
      updateBorderColor();
      triggerWaveAnnouncement();
    }
  }
}

function keyReleased() {
  pressedKeys[key] = false;
}

function mousePressed() {
  if (gameState === "title") {
    let btnX = 576, btnY = 360, btnW = 178, btnH = 42;
    if (Math.abs(mouseX - btnX) < btnW / 2 && Math.abs(mouseY - btnY) < btnH / 2) {
      gameState = "howto";
    }
    let insX = 576, insY = 412, insW = 178, insH = 42;
    if (Math.abs(mouseX - insX) < insW / 2 && Math.abs(mouseY - insY) < insH / 2) {
      gameState = "inspiration";
    }
  }
}

// how to play section
function showHowToScreen() {
  push();
  // background
  noStroke();
  fill(0, 0, 0, 155);
  rectMode(CORNER);
  rect(25, 25, width - 50, height - 50);

  // title
  fill(255, 255, 80);
  textAlign(CENTER);
  textSize(28);
  text("HOW TO PLAY", width / 2, 62);

  let x  = 58;
  let y  = 96;
  let lh = 21;

  textAlign(LEFT);

  // goals
  fill(100, 220, 255);
  textSize(15);
  text("GOAL", x, y);
  y += lh + 3;

  fill(210, 210, 210);
  textSize(12);
  text("Destroy enemy ships and survive as many waves as possible.", x, y);              y += lh;
  text("Your ammo refills slowly — don't overshoot or you'll run dry.", x, y);           y += lh;
  text("Every 5 waves a boss spawns. Defeat it to keep going.", x, y);                   y += lh;
  text("Don't let any enemy ship reach the left side — each one costs a shield life!", x, y);
  y += lh + 14;

  // controls
  fill(100, 220, 255);
  textSize(15);
  text("CONTROLS", x, y);
  y += lh + 3;

  fill(210, 210, 210);
  textSize(12);
  text("W / S           —  Move your ship up and down", x, y);                           y += lh;
  text("Spacebar      —  Fire laser cannon  (hold for continuous fire)", x, y);          y += lh;
  text("B                   —  Launch a bomb that destroys all enemies on screen", x, y);
  y += lh + 14;

  // powerups
  fill(100, 220, 255);
  textSize(15);
  text("POWER-UPS  (random drops from destroyed enemies)", x, y);
  y += lh + 3;

  fill(210, 210, 210);
  textSize(12);
  text("♥   Shield restore  (5%)   — Restores 1 shield life", x, y);                    y += lh;
  text("⚡   Ammo refill  (10%)    — Instantly refills ammo to 25", x, y);              y += lh;
  text("🔥   Rapid fire  (10%)      — Doubles fire rate for 10 seconds", x, y);         y += lh;
  text("💣   Extra bomb  (1%)       — Adds 1 bomb to your supply", x, y);

  // footer
  fill(160, 255, 160);
  textAlign(CENTER);
  textSize(13);
  if (frameCount % 60 < 30) {
    text("PRESS ENTER TO START", width / 2, height - 28);
  }

  pop();
}

function showInspirationScreen() {
  push();

  noStroke();
  fill(0, 0, 0, 155);
  rectMode(CORNER);
  rect(25, 25, width - 50, height - 50);

  fill(255, 255, 80);
  textAlign(CENTER);
  textSize(28);
  text("INSPIRATION", width / 2, 62);

  let x  = 58;
  let y  = 106;
  let lh = 22;

  textAlign(LEFT);
  fill(210, 210, 210);
  textSize(12);
  text("Our arcade game project, Stellar Siege, was heavily inspired by elements of many different", x, y); y += lh;
  text("1980s arcade games, including Space Invaders, Galaga, and Asteroids. However, the one", x, y); y += lh;
  text("game that we took the most inspiration from originally was Duck Hunt. With our game being", x, y); y += lh;
  text("about space and honestly looking and playing quite a bit differently from how Duck Hunt", x, y); y += lh;
  text("originally did, it may seem wrong that we didn't base our game on something like Asteroids", x, y); y += lh;
  text("originally. We did have to pivot from a point-and-click style, similar to what Duck Hunt", x, y); y += lh;
  text("used with the old NES blaster accessory, to a keyboard-controlled shooter, but this made", x, y); y += lh;
  text("the game more unique and user-friendly. Overall, while we did take much inspiration from", x, y); y += lh;
  text("the themes of other games along the way, we based the original mechanics of our game and", x, y); y += lh;
  text("the wave scoring system on Duck Hunt's old-school style.", x, y);

  fill(160, 255, 160);
  textAlign(CENTER);
  textSize(13);
  if (frameCount % 60 < 30) {
    text("PRESS ENTER TO START", width / 2, height - 28);
  }

  pop();
}