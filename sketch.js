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


