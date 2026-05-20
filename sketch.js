let gameState = "title";


// Scores
let score = 0;
let highScore = 0;
let currentWave = 1;
let shieldHP = 3;        


// Sprites

let player;
let enemies;               // enemy sprites
let playerBullets;         // bullets
let enemyBullets;          // bullets enemies fire


let enemySpawnTimer = 0;   
let enemyFireTimer  = 0; 


function preload() {
  // load characters here (note to self:)$

}=
function setup() {
  createCanvas(800, 500); 

  enemies      = new Group();
  playerBullets = new Group();
  enemyBullets  = new Group();

 
  player        = new Sprite();
  player.x      = 80;           // Start near the left edge
  player.y      = height / 2;   // Start vertically centered
  player.w      = 40;
  player.h      = 30;
  player.color  = "cyan";
  player.collider = "dynamic";  // Needed for collision detection
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
