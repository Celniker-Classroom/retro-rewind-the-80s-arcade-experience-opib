let gameState = "title";

// Scores
let score = 0;
let highScore = 0;
let currentWave = 1;
let shieldHP = 3;        
let bulletsRemaining = 25;       
let bulletRecharge = 0;     
let bulletRechargeInterval = 144;

// Wave timer (new wave every 20 seconds)
let waveTimer = 0;
let waveTimerMax = 1200;

// bomb usage 
let bombCount = 3;
let explosions = [];

// sprites
let playerImg;
let enemyImg; 
let enemies;               // enemy sprites
let playerBullets;         // bullets
let enemyBullets;          // bullets enemies fire

let enemySpawnTimer = 0;   
let enemyFireTimer  = 0; 


function preload() {
  playerImg = loadImage("player.png");  
  enemyImg  = loadImage("enemy.png"); 
}


function setup() {
  createCanvas(800, 500); 

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
}


function draw() {
  background(0);

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
  // Advance wave every 20 seconds
  tickWaveTimer();

  // Function to move a player (W,A,S,D)
  movePlayer();

  handlePlayerShooting();

  spawnEnemies();

  moveEnemiesAndShoot();

  // moves bullets
  moveBullets();


  checkCollisions();

  updateAndDrawExplosions();

  // user interface displaying data and shields etc
  drawHUD();
}

function tickWaveTimer() {
  waveTimer++;

  if (waveTimer >= waveTimerMax) {
    waveTimer = 0;       // reset timer
    currentWave++;       // advance wave
  }
}


// player movement and speed
function movePlayer() {
  let speed = 4;

  if (kb.pressing("up")   || kb.pressing("w")) player.y -= speed;
  if (kb.pressing("down") || kb.pressing("s")) player.y += speed;


  player.y = constrain(player.y, 20, height - 20);
}


let shootCooldown = 0;

// bullet limit (25)
function handlePlayerShooting() {
  if (shootCooldown > 0) shootCooldown--;

  bulletRecharge++;
  if (bulletRecharge >= bulletRechargeInterval) {
    bulletRecharge = 0;
    if (bulletsRemaining < 25) bulletsRemaining++; 
  }

  // Only fire if cooldown is ready + bullets are available
  if (kb.pressing("space") && shootCooldown === 0 && bulletsRemaining > 0) {
    let b          = new playerBullets.Sprite();
    b.x            = player.x + 25;
    b.y            = player.y;
    b.w            = 14;
    b.h            = 5;
    b.color        = "yellow";
    b.collider     = "dynamic";
    b.gravityScale = 0;

    shootCooldown = 15;
    bulletsRemaining--; 
  }
}

function useBomb() {
  if (bombCount <= 0) return;  // no bombs left, do nothing
  bombCount--;
   for (let e of enemies) createExplosion(e.x, e.y);

  // Remove every enemy and every enemy bullet instantly
  enemies.removeAll();
  enemyBullets.removeAll();

  // Bonus points for using a bomb
  score += 200;
}

function spawnEnemies() {
  enemySpawnTimer++;

  // Starting at 120 frames (2 sec) instead of 90 so wave 1 is easier
  let spawnInterval = max(20, 120 - (currentWave * 15));

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
  // Wave 1 starts slower — speed scales up more gradually
  let enemySpeed = 0.5 + (currentWave * 0.3);

  enemyFireTimer++;

  // Wave 1 fires less often — interval starts higher
  let fireInterval = max(40, 150 - (currentWave * 10));

  for (let e of enemies) {
    e.x -= enemySpeed;

    // If enemy reaches left edge, damage shield
    if (e.x < 0) {
      createExplosion(e.x, e.y);
      e.remove();
      shieldHP--;
      checkShieldDepleted();
    }

    // Enemy fires a bullet toward the player
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
  // Player bullets move right
  for (let b of playerBullets) {
    b.x += 8;
    if (b.x > width + 20) b.remove();
  }

  // Enemy bullets move left
  for (let b of enemyBullets) {
    b.x -= 6;
    if (b.x < -20) b.remove();
  }
}


function checkCollisions() {
  // Player bullet hits an enemy
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


function drawHUD() {
  fill("white");
  noStroke();
  textAlign(LEFT);

 
  let secondsLeft = Math.ceil((waveTimerMax - waveTimer) / 60);

  textSize(16);
  text("Score: " + score, 10, 25);
  text("Wave:  " + currentWave, 10, 48);
  text("Next wave: " + secondsLeft + "s", 10, 71);
  text("Ammo: " + bulletsRemaining + " / 25", 10, 94);
  text("Bombs: " + "💣".repeat(max(0, bombCount)), 10, 117);
  text("Shield: " + "♥ ".repeat(max(0, shieldHP)), 10, height - 10);
}

function createExplosion(x, y) {
  let numParticles = 8;
  for (let i = 0; i < numParticles; i++) {
    let angle = (TWO_PI / numParticles) * i;
    let speed = random(1.5, 4);
    explosions.push({
      x: x, y: y,
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

function keyPressed() {
  // B key uses a bomb
  if (key === "b" || key === "B") {
    if (gameState === "play") useBomb();
  }

  if (key === "Enter") {
    if (gameState === "title") {
      gameState = "play";
    }

    else if (gameState === "over") {
      // Reset everything and restart
      score                    = 0;
      currentWave              = 1;
      shieldHP                 = 3;
      bulletsRemaining         = 25;
      bulletRecharge           = 0;
      waveTimer                = 0;
      bombCount                = 3;
      enemySpawnTimer          = 0;
      enemyFireTimer           = 0;
      explosions = [];
      enemies.removeAll();
      playerBullets.removeAll();
      enemyBullets.removeAll();
      player.x = 80;
      player.y = height / 2;
      gameState = "play";
    }
  }
}