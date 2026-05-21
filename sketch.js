let gameState = "title";

// Scores
let score = 0;
let highScore = 0;
let currentWave = 1;
let shieldHP = 3;        
let bulletsRemaining = 25;       
let bulletRecharge = 0;     
let bulletRechargeInterval = 144;

// Sprites

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

  enemies      = new Group();
  playerBullets = new Group();
  enemyBullets  = new Group();

 
  player        = new Sprite();
  player.image  = playerImg;
  player.x      = 80;
  player.y      = height / 2;
  player.w      = 80;
  player.h      = 50;
  player.collider = "dynamic";
  player.gravityScale = 0;  
}

function draw() {
 background(0);  // Clear screen to black 

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
 text("Score: " + score,         width / 2, 260);
 text("Wave reached: " + currentWave, width / 2, 295);

 textSize(16);
 if (frameCount % 60 < 30) {
   text("PRESS ENTER TO RESTART", width / 2, 360);
 }
}

function runGameplay() {

 // Function to move a player (W,A,S.D)
 movePlayer();

 // Function to shoot the gun
 handlePlayerShooting();

 // Function to spawn in enimies randomly
 spawnEnemies();

 // Controls enemy shooting and moving
 moveEnemiesAndShoot();

 // Moves bullets
 moveBullets();

 // Checks to see if someone got hit
 checkCollisions();

 // User interface displaying data and sheilds etc
 drawHUD();
}

//player movement and speed
function movePlayer() {
 let speed = 4;

 if (kb.pressing("up")   || kb.pressing("w")) player.y -= speed;
 if (kb.pressing("down") || kb.pressing("s")) player.y += speed;

// to make sure that a player cant leave the visual field
 player.y = constrain(player.y, 20, height - 20);
}

let shootCooldown = 0;

// adds limit so user can only fire 25 bullets every minute
function handlePlayerShooting() {
  b.gravityScale = 0
  if (shootCooldown > 0) shootCooldown--;

  // rechares one bullet every 144 frames so you get a bullet every ~2.5 seconds
  bulletRecharge++;
  if (bulletRecharge >= bulletRechargeInterval) {
    bulletRecharge = 0;
    if (bulletsRemaining < 25) bulletsRemaining++; 
  }

  // only fire if cooldown is ready + bullets are available
  if (kb.pressing("space") && shootCooldown === 0 && bulletsRemaining > 0) {
    let b    = new playerBullets.Sprite();
    b.x      = player.x + 25;
    b.y      = player.y;
    b.w      = 14;
    b.h      = 5;
    b.color  = "yellow";
    b.collider = "dynamic";

    shootCooldown = 15;
    bulletsRemaining--; 
  }
}


function spawnEnemies() {
 enemySpawnTimer++;
 e.gravityScale = 0;

 let spawnInterval = max(30, 90 - (currentWave * 10));

 if (enemySpawnTimer >= spawnInterval) {
   enemySpawnTimer = 0;  

//gives foes a random start position
   let e    = new enemies.Sprite();
   e.x      = width + 20;          
   e.y      = random(40, height - 40); 
   e.w        = 60;          
   e.h        = 40;           
   e.image    = enemyImg;    
   e.collider = "dynamic";
 }
}

function moveEnemiesAndShoot() {
  b.gravityScale = 0
  let enemySpeed = 1 + (currentWave * 0.3);  // Gets faster each wave

 enemyFireTimer++;
 let fireInterval = max(40, 120 - (currentWave * 10));  // Fire more often each wave


 for (let e of enemies) {
   // Move left
   e.x -= enemySpeed;

   if (e.x < 0) {
     e.remove();
     shieldHP--;
     checkShieldDepleted();
   }

   if (enemyFireTimer >= fireInterval) {
     let b    = new enemyBullets.Sprite();
     b.x      = e.x - 20;
     b.y      = e.y;
     b.w      = 12;
     b.h      = 5;
     b.color  = "orange";
     b.collider = "dynamic";
   }
 }

 // Reset fire timer after one round of shots
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


 // Player bullet hits an enemy
 playerBullets.overlaps(enemies, (bullet, enemy) => {
   bullet.remove();
   enemy.remove();
   score += 100;
   checkWaveAdvance();
 });


 // Enemy bullet hits the player
 enemyBullets.overlaps(player, (bullet, p) => {
   bullet.remove();
   shieldHP--;
   checkShieldDepleted();
 });
}

let enemiesDestroyedThisWave = 0;
let enemiesToAdvance = 8;  // Destroy 8 enemies to advance


function checkWaveAdvance() {
 enemiesDestroyedThisWave++;


 if (enemiesDestroyedThisWave >= enemiesToAdvance) {
   currentWave++;
   enemiesDestroyedThisWave = 0;
   enemiesToAdvance += 2;  // every wave requires more kills
 }
}

function checkShieldDepleted() {
 if (shieldHP <= 0) {
   if (score > highScore) highScore = score;  // save high score
   gameState = "over";
 }
}


 function drawHUD() {
  fill("white");
  noStroke();
  textAlign(LEFT);

  textSize(16);
  text("Score: " + score, 10, 25);
  text("Wave:  " + currentWave, 10, 48);
  text("Shield: " + "♥ ".repeat(max(0, shieldHP)), 10, height - 10);
  text("Ammo: " + bulletsRemaining + " / 25", 10, 71);
}

function keyPressed() {

 if (key === "Enter") {
   if (gameState === "title") {
     // Start the game
     gameState = "play";
   }

   else if (gameState === "over") {
     // Reset everything
     score                    = 0;
     currentWave              = 1;
     shieldHP                 = 3;
     bulletsRemaining         = 25;   // ADD
     bulletRecharge           = 0;
     enemiesDestroyedThisWave = 0;
     enemiesToAdvance         = 8;
     enemySpawnTimer          = 0;
     enemyFireTimer           = 0;
     enemies.removeAll();
     playerBullets.removeAll();
     enemyBullets.removeAll();
     player.x = 80;
     player.y = height / 2;
     gameState = "play";
   }
 }
}

