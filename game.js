const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("score"),
  timer: document.getElementById("timer"),
  lives: document.getElementById("lives"),
  status: document.getElementById("status"),
};

const WORLD_WIDTH = 3200;
const GROUND_Y = 470;
const keys = new Set();

const state = {
  score: 0,
  lives: 3,
  time: 120,
  startedAt: performance.now(),
  gameOver: false,
  won: false,
};

const player = {
  x: 60,
  y: 350,
  w: 38,
  h: 52,
  vx: 0,
  vy: 0,
  speed: 0.7,
  jump: -14,
  onGround: false,
  invincible: 0,
};

const platforms = [
  { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 120, type: "ground" },
  { x: 260, y: 400, w: 120, h: 20 },
  { x: 460, y: 340, w: 140, h: 20 },
  { x: 690, y: 280, w: 160, h: 20 },
  { x: 1040, y: 380, w: 130, h: 20 },
  { x: 1260, y: 310, w: 130, h: 20 },
  { x: 1500, y: 250, w: 180, h: 20 },
  { x: 1790, y: 360, w: 150, h: 20 },
  { x: 2150, y: 300, w: 170, h: 20 },
  { x: 2500, y: 360, w: 180, h: 20 },
  { x: 2860, y: 300, w: 120, h: 20 },
];

const coins = [
  ...Array.from({ length: 12 }, (_, i) => ({ x: 290 + i * 230, y: 220 + (i % 3) * 35, r: 11, taken: false })),
  { x: 500, y: 300, r: 11, taken: false },
  { x: 1530, y: 200, r: 11, taken: false },
  { x: 2890, y: 250, r: 11, taken: false },
];

const enemies = [
  { x: 750, y: 438, w: 36, h: 32, min: 700, max: 920, dir: 1, speed: 1.5 },
  { x: 1380, y: 438, w: 36, h: 32, min: 1300, max: 1640, dir: -1, speed: 1.8 },
  { x: 2320, y: 438, w: 36, h: 32, min: 2260, max: 2600, dir: 1, speed: 1.6 },
];

const goal = { x: 3090, y: 390, w: 24, h: 80 };

function resetPlayer() {
  player.x = 60;
  player.y = 350;
  player.vx = 0;
  player.vy = 0;
  player.invincible = 120;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(delta) {
  if (state.gameOver || state.won) return;

  state.time = Math.max(0, 120 - Math.floor((performance.now() - state.startedAt) / 1000));
  if (state.time === 0) {
    state.gameOver = true;
    ui.status.textContent = "انتهى الوقت! اضغط R لإعادة المحاولة.";
  }

  const accel = 0.8;
  const friction = 0.82;

  if (keys.has("ArrowRight") || keys.has("d")) player.vx += accel;
  if (keys.has("ArrowLeft") || keys.has("a")) player.vx -= accel;
  player.vx *= friction;
  player.vx = clamp(player.vx, -6.2, 6.2);

  player.vy += 0.65;
  player.vy = Math.min(player.vy, 16);

  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  for (const p of platforms) {
    const wasAbove = player.y + player.h - player.vy <= p.y;
    if (intersects(player, p) && wasAbove) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.y > canvas.height + 200) {
    state.lives -= 1;
    ui.status.textContent = "سقطت! انتبه للقفزات.";
    if (state.lives <= 0) {
      state.gameOver = true;
      ui.status.textContent = "خسرت كل الأرواح. اضغط R للإعادة.";
    }
    resetPlayer();
  }

  for (const enemy of enemies) {
    enemy.x += enemy.speed * enemy.dir;
    if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.dir *= -1;

    if (!state.gameOver && intersects(player, enemy) && player.invincible <= 0) {
      const stomp = player.vy > 2 && player.y + player.h - enemy.y < 18;
      if (stomp) {
        player.vy = -9;
        enemy.x = enemy.min;
        state.score += 120;
        ui.status.textContent = "ضربة ذكية! +120";
      } else {
        state.lives -= 1;
        ui.status.textContent = "تلقيت ضررًا!";
        if (state.lives <= 0) {
          state.gameOver = true;
          ui.status.textContent = "خسرت كل الأرواح. اضغط R للإعادة.";
        }
        resetPlayer();
      }
    }
  }

  for (const c of coins) {
    if (c.taken) continue;
    const hit = intersects(player, { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 });
    if (hit) {
      c.taken = true;
      state.score += 50;
      ui.status.textContent = "عملة جديدة! +50";
    }
  }

  if (intersects(player, goal)) {
    state.won = true;
    state.score += state.time * 5;
    ui.status.textContent = "ممتاز! أنهيت المرحلة بنجاح. اضغط R للعب مجددًا.";
  }

  player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);
  player.invincible -= 1;

  ui.score.textContent = state.score;
  ui.timer.textContent = state.time;
  ui.lives.textContent = state.lives;
}

function drawBackground(cameraX) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#84d2ff");
  sky.addColorStop(1, "#d8f6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#b8e6ff";
  for (let i = 0; i < 8; i++) {
    const x = ((i * 310 - cameraX * 0.25) % (canvas.width + 300)) - 140;
    ctx.beginPath();
    ctx.ellipse(x, 120 + (i % 2) * 30, 90, 32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#6cbf6c";
  for (let i = 0; i < 14; i++) {
    const x = ((i * 240 - cameraX * 0.45) % (canvas.width + 280)) - 150;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 80, 300 + (i % 3) * 40);
    ctx.lineTo(x + 160, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
}

function draw() {
  const cameraX = clamp(player.x - canvas.width * 0.35, 0, WORLD_WIDTH - canvas.width);
  drawBackground(cameraX);

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const p of platforms) {
    ctx.fillStyle = p.type === "ground" ? "#6f4f32" : "#8b5e3c";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#ad7a50";
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  for (const c of coins) {
    if (c.taken) continue;
    ctx.fillStyle = "#ffd54d";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4a300";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const enemy of enemies) {
    ctx.fillStyle = "#8f2d56";
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(enemy.x + 6, enemy.y + 8, 7, 7);
    ctx.fillRect(enemy.x + 22, enemy.y + 8, 7, 7);
  }

  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(goal.x + goal.w, goal.y, 40, 20);

  if (!(player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0)) {
    ctx.fillStyle = "#2a2a72";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = "#ffe0bd";
    ctx.fillRect(player.x + 7, player.y + 6, 24, 16);
    ctx.fillStyle = "#ff595e";
    ctx.fillRect(player.x + 6, player.y + 24, 26, 20);
  }

  ctx.restore();

  if (state.gameOver || state.won) {
    ctx.fillStyle = "#00000088";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(state.won ? "فزت!" : "انتهت اللعبة", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "24px sans-serif";
    ctx.fillText("اضغط R لإعادة اللعب", canvas.width / 2, canvas.height / 2 + 30);
  }
}

function loop(now) {
  const delta = now;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if ((e.key === " " || e.key === "ArrowUp" || e.key === "w") && player.onGround && !state.gameOver && !state.won) {
    player.vy = player.jump;
    player.onGround = false;
  }

  if (e.key.toLowerCase() === "r") {
    state.score = 0;
    state.lives = 3;
    state.time = 120;
    state.startedAt = performance.now();
    state.gameOver = false;
    state.won = false;
    ui.status.textContent = "تمت إعادة المرحلة. بالتوفيق!";
    coins.forEach((c) => (c.taken = false));
    resetPlayer();
  }
});

window.addEventListener("keyup", (e) => keys.delete(e.key));

resetPlayer();
requestAnimationFrame(loop);
