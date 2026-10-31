'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = 800;
const H = 600;
const FLOOR_Y = 580;     // acid line, same on every level
const STEP = 14;         // how far a foot may sink into a platform edge and still count as "landing"
const STORAGE_KEY = 'soulEscape.unlocked';

/* ------------------------------------------------------------------ */
/*  Level building blocks                                              */
/* ------------------------------------------------------------------ */

// solid ground
const solid = (x, y, w, h = 20) => ({ type: 'solid', x, y, w, h });

// platform that glides back and forth. axis: 'x' | 'y'. range: travel distance (px).
// period: frames for one full there-and-back. phase: 0..1 offset into the cycle.
const mover = (x, y, w, axis, range, period, phase = 0) =>
    ({ type: 'mover', x, y, w, h: 20, axis, range, period, phase });

// spikes standing on a platform whose top edge is at topY
const spikes = (x, topY, w) => ({ type: 'spike', x, y: topY - 14, w, h: 14 });

// bounce pad standing on a platform whose top edge is at topY
const spring = (x, topY, w = 40, power = 17) =>
    ({ type: 'spring', x, y: topY - 12, w, h: 12, power, squash: 0 });

// exit portal standing on a platform whose top edge is at topY
const goal = (x, topY) => ({ type: 'goal', x, y: topY - 80, w: 40, h: 80 });

const LEVELS = [
    {
        name: 'ACID STEPS',
        start: { x: 40, y: 480 },
        platforms: [
            solid(20, 520, 100),
            solid(180, 460, 120),
            solid(380, 400, 90),
            solid(560, 340, 120),
            solid(380, 250, 100),
            solid(180, 190, 120),
            solid(40, 130, 80),
            solid(250, 70, 120),
            solid(500, 120, 80),
            solid(650, 180, 130),
            goal(720, 180),
        ],
    },
    {
        name: 'SHARP EDGES',
        start: { x: 40, y: 480 },
        platforms: [
            // row 1: left to right, hop every spike patch
            solid(20, 520, 100),
            solid(160, 490, 120), spikes(205, 490, 28),
            solid(330, 460, 120), spikes(375, 460, 28),
            solid(500, 430, 120), spikes(545, 430, 28),
            // row 2: right to left
            solid(680, 350, 100),
            solid(490, 310, 150), spikes(545, 310, 28),
            solid(290, 270, 150), spikes(345, 270, 28),
            solid(90, 230, 150),  spikes(145, 230, 28),
            // top: back to the right and out
            solid(20, 150, 90),
            solid(180, 120, 200), spikes(250, 120, 28),
            goal(330, 120),
        ],
    },
    {
        name: 'ELEVATORS',
        start: { x: 40, y: 480 },
        platforms: [
            solid(20, 520, 100),
            mover(165, 400, 70, 'y', 120, 200, 0.5),
            solid(300, 400, 100),
            mover(450, 260, 70, 'y', 140, 200, 0.5),
            solid(590, 260, 100),
            mover(730, 120, 60, 'y', 140, 200, 0.5),
            solid(580, 120, 110),
            goal(600, 120),
        ],
    },
    {
        name: 'PENDULUM',
        start: { x: 40, y: 480 },
        platforms: [
            solid(20, 520, 100),
            mover(150, 480, 80, 'x', 170, 240, 0),
            solid(400, 440, 80),
            mover(520, 380, 80, 'x', 100, 240, 0),
            solid(730, 300, 60),
            solid(560, 240, 100),
            mover(340, 200, 80, 'x', 130, 240, 0),
            solid(200, 160, 100),
            solid(40, 110, 100),
            goal(90, 110),
        ],
    },
    {
        name: 'SPRING LOADED',
        start: { x: 36, y: 480 },
        platforms: [
            solid(20, 520, 130),
            spring(100, 520),
            solid(210, 320, 150),
            spring(310, 320),
            solid(450, 140, 150), spikes(500, 140, 28),
            solid(660, 200, 130),
            goal(730, 200),
        ],
    },
    {
        name: 'THE GAUNTLET',
        start: { x: 36, y: 480 },
        platforms: [
            solid(20, 520, 110),
            spring(80, 520),
            solid(190, 330, 120),
            mover(360, 330, 80, 'x', 150, 260, 0),
            solid(600, 330, 110),
            mover(740, 200, 50, 'y', 130, 220, 0.5),
            solid(560, 200, 150), spikes(620, 200, 28),
            mover(300, 200, 80, 'x', 160, 260, 0.5),
            solid(130, 200, 120),
            spring(160, 200),
            solid(280, 70, 170),
            goal(400, 70),
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let gameState = 'START';   // START | PLAY | LEVEL_DONE | WIN
let levelIndex = 0;
let platforms = [];
let tick = 0;
let deaths = 0;
let levelDeaths = 0;
let flash = 0;

const keys = { left: false, right: false, up: false };

const player = {
    x: 0,
    y: 0,
    width: 24,
    height: 24,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: 12.5,
    gravity: 0.6,
    friction: 0.8,
    grounded: false,
    ground: null,
    color: '#1cf85d',
    trail: []
};

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                        */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const show = (id) => { $(id).style.display = 'flex'; };
const hide = (id) => { $(id).style.display = 'none'; };

function updateHud() {
    const def = LEVELS[levelIndex];
    $('hud').textContent =
        '> level ' + (levelIndex + 1) + '/' + LEVELS.length + ' // ' + def.name + ' // deaths ' + deaths;
}

function getUnlocked() {
    try {
        const n = parseInt(localStorage.getItem(STORAGE_KEY), 10);
        if (n >= 1) return Math.min(n, LEVELS.length);
    } catch (e) { /* storage unavailable */ }
    return 1;
}

function unlock(count) {
    const next = Math.min(count, LEVELS.length);
    if (next <= getUnlocked()) return;
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch (e) { /* ignore */ }
}

function buildLevelSelect() {
    const box = $('level-select');
    box.textContent = '';
    const unlocked = getUnlocked();
    LEVELS.forEach((def, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lvl-btn';
        b.textContent = String(i + 1);
        b.title = def.name;
        b.disabled = i >= unlocked;
        b.addEventListener('click', () => { deaths = 0; startLevel(i); });
        box.appendChild(b);
    });
}

/* ------------------------------------------------------------------ */
/*  Level loading                                                      */
/* ------------------------------------------------------------------ */

function buildPlatforms(def) {
    const list = [
        { type: 'boundary', x: -20, y: -1000, w: 20, h: 2000 },
        { type: 'boundary', x: W, y: -1000, w: 20, h: 2000 },
        { type: 'lava', x: 0, y: FLOOR_Y, w: W, h: 20 },
    ];
    for (const p of def.platforms) {
        const q = Object.assign({}, p);
        if (q.type === 'mover') { q.x0 = q.x; q.y0 = q.y; q.dx = 0; q.dy = 0; }
        list.push(q);
    }
    return list;
}

function moverOffset(p, t) {
    return p.range * (0.5 - 0.5 * Math.cos(2 * Math.PI * (t / p.period + p.phase)));
}

function placeMovers(t) {
    for (const p of platforms) {
        if (p.type !== 'mover') continue;
        const o = moverOffset(p, t);
        const nx = p.axis === 'x' ? p.x0 + o : p.x0;
        const ny = p.axis === 'y' ? p.y0 + o : p.y0;
        p.dx = nx - p.x;
        p.dy = ny - p.y;
        p.x = nx;
        p.y = ny;
    }
}

function resetPlayer() {
    const start = LEVELS[levelIndex].start;
    player.x = start.x;
    player.y = start.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.ground = null;
    player.trail = [];
    tick = 0;
    for (const p of platforms) if (p.type === 'spring') p.squash = 0;
    placeMovers(0);
    for (const p of platforms) if (p.type === 'mover') { p.dx = 0; p.dy = 0; }
}

function loadLevel(i) {
    levelIndex = i;
    platforms = buildPlatforms(LEVELS[i]);
    levelDeaths = 0;
    resetPlayer();
    updateHud();
}

function hideOverlays() {
    hide('start-screen');
    hide('level-screen');
    hide('win-screen');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function startLevel(i) {
    loadLevel(i);
    hideOverlays();
    gameState = 'PLAY';
}

function startGame() {
    deaths = 0;
    startLevel(0);
}

function nextLevel() {
    startLevel(levelIndex + 1);
}

function resetGame() {
    startGame();
}

function die() {
    deaths++;
    levelDeaths++;
    flash = 10;
    resetPlayer();
    updateHud();
}

function finishLevel() {
    unlock(levelIndex + 2);
    if (levelIndex === LEVELS.length - 1) {
        gameState = 'WIN';
        $('win-msg').textContent = 'You escaped the dungeon. Total deaths: ' + deaths + '.';
        show('win-screen');
    } else {
        gameState = 'LEVEL_DONE';
        $('level-title').textContent = 'Level ' + (levelIndex + 1) + ' clear';
        $('level-msg').textContent = 'Deaths on this level: ' + levelDeaths + '.';
        show('level-screen');
    }
}

function primaryAction() {
    if (gameState === 'START') startGame();
    else if (gameState === 'LEVEL_DONE') nextLevel();
    else if (gameState === 'WIN') resetGame();
}

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

function leaveSource() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'close-source' }, window.location.origin);
    }
}

$('return-btn').addEventListener('click', leaveSource);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        leaveSource();
        return;
    }
    if (e.code === 'Enter') {
        e.preventDefault();
        primaryAction();
        return;
    }
    if (e.code === 'KeyR' && gameState === 'PLAY') {
        resetPlayer();
        return;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        keys.up = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
});

const bindTouch = (id, key) => {
    const el = $(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    el.addEventListener('touchcancel', (e) => { e.preventDefault(); keys[key] = false; });
};
bindTouch('btn-left', 'left');
bindTouch('btn-right', 'right');
bindTouch('btn-jump', 'up');

// CSP forbids inline handlers (onclick="..."), so every button is bound here.
$('start-btn').addEventListener('click', startGame);
$('next-btn').addEventListener('click', nextLevel);
$('replay-btn').addEventListener('click', resetGame);

/* ------------------------------------------------------------------ */
/*  Physics                                                            */
/* ------------------------------------------------------------------ */

function collides(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.width > b.x &&
           a.y < b.y + b.h &&
           a.y + a.height > b.y;
}

const isSolid = (p) => p.type === 'solid' || p.type === 'mover' || p.type === 'spring' || p.type === 'boundary';

function spikeHitbox(p) {
    return { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 };
}

function update() {
    if (gameState !== 'PLAY') return;

    // --- moving platforms, and carrying whoever stands on one ---
    tick++;
    placeMovers(tick);
    for (const p of platforms) if (p.type === 'spring' && p.squash > 0) p.squash--;
    if (player.ground && player.ground.type === 'mover') {
        player.x += player.ground.dx;
        player.y += player.ground.dy;
    }

    // --- horizontal movement ---
    if (keys.right) {
        player.vx += 1;
        if (player.vx > player.speed) player.vx = player.speed;
    } else if (keys.left) {
        player.vx -= 1;
        if (player.vx < -player.speed) player.vx = -player.speed;
    } else {
        player.vx *= player.friction;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    player.x += player.vx;

    for (const p of platforms) {
        if (!isSolid(p) || !collides(player, p)) continue;
        // stepping onto a mover / spring from the side counts as landing, not as hitting a wall
        if ((p.type === 'mover' || p.type === 'spring') && player.y + player.height - p.y <= STEP) continue;
        if (player.vx > 0) player.x = p.x - player.width;
        else if (player.vx < 0) player.x = p.x + p.w;
        else {
            const fromLeft = player.x + player.width - p.x;
            const fromRight = p.x + p.w - player.x;
            player.x += fromLeft < fromRight ? -fromLeft : fromRight;
        }
        player.vx = 0;
    }

    // --- jumping and vertical movement ---
    if (keys.up && player.grounded) {
        player.vy = -player.jumpPower;
        player.grounded = false;
    }

    player.vy += player.gravity;
    if (player.vy > 15) player.vy = 15;

    const prevY = player.y;
    player.y += player.vy;
    player.grounded = false;
    player.ground = null;

    for (const p of platforms) {
        if (!isSolid(p) || !collides(player, p)) continue;
        if (player.vy > 0 && prevY + player.height <= p.y + STEP) {
            player.y = p.y - player.height;
            if (p.type === 'spring') {
                player.vy = -p.power;
                p.squash = 8;
            } else {
                player.vy = 0;
                player.grounded = true;
                player.ground = p;
            }
        } else if (player.vy < 0 && prevY >= p.y + p.h - STEP) {
            player.y = p.y + p.h;
            player.vy = 0;
        }
    }

    if (player.y < 0) {
        player.y = 0;
        if (player.vy < 0) player.vy = 0;
    }

    // --- hazards and exit ---
    for (const p of platforms) {
        if (p.type === 'lava' && collides(player, p)) { die(); return; }
        if (p.type === 'spike' && collides(player, spikeHitbox(p))) { die(); return; }
        if (p.type === 'goal' && collides(player, p)) { finishLevel(); return; }
    }

    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 8) player.trail.shift();
}

/* ------------------------------------------------------------------ */
/*  Drawing                                                            */
/* ------------------------------------------------------------------ */

function drawPlatform(p) {
    if (p.type === 'solid') {
        ctx.fillStyle = '#0d4a24';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#1cf85d';
        ctx.fillRect(p.x, p.y, p.w, 4);
    } else if (p.type === 'mover') {
        // faint rail showing where it travels
        ctx.strokeStyle = '#146b33';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        if (p.axis === 'x') {
            ctx.moveTo(p.x0 + p.w / 2, p.y0 + p.h / 2);
            ctx.lineTo(p.x0 + p.range + p.w / 2, p.y0 + p.h / 2);
        } else {
            ctx.moveTo(p.x0 + p.w / 2, p.y0 + p.h / 2);
            ctx.lineTo(p.x0 + p.w / 2, p.y0 + p.range + p.h / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#126b33';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#7dffb2';
        ctx.fillRect(p.x, p.y, p.w, 4);
        ctx.fillStyle = '#031e08';
        ctx.fillRect(p.x + 6, p.y + 10, p.w - 12, 3);
    } else if (p.type === 'spring') {
        const squash = p.squash > 0 ? 6 : 0;
        ctx.fillStyle = '#d8ffe8';
        ctx.fillRect(p.x, p.y + squash, p.w, 4);
        ctx.strokeStyle = '#1cf85d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const coils = 5;
        const bottom = p.y + p.h;
        ctx.moveTo(p.x + 4, bottom);
        for (let i = 0; i < coils; i++) {
            const cx = p.x + 4 + ((p.w - 8) * (i + 0.5)) / coils;
            const cy = p.y + 4 + squash + (i % 2 === 0 ? 0 : (p.h - 4 - squash));
            ctx.lineTo(cx, cy);
        }
        ctx.lineTo(p.x + p.w - 4, bottom);
        ctx.stroke();
    } else if (p.type === 'spike') {
        ctx.fillStyle = '#7dffb2';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#1cf85d';
        const n = Math.max(1, Math.round(p.w / 10));
        const sw = p.w / n;
        for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.moveTo(p.x + i * sw, p.y + p.h);
            ctx.lineTo(p.x + i * sw + sw / 2, p.y);
            ctx.lineTo(p.x + (i + 1) * sw, p.y + p.h);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    } else if (p.type === 'lava') {
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.fillStyle = '#7dffb2';
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = '#1cf85d';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#d8ffe8';
        ctx.fillRect(p.x, p.y, p.w, 3);
    } else if (p.type === 'goal') {
        const glow = Math.abs(Math.sin(Date.now() / 300)) * 20;
        ctx.fillStyle = '#d8ffe8';
        ctx.shadowBlur = 20 + glow;
        ctx.shadowColor = '#1cf85d';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#f4fff8';
        ctx.fillRect(p.x + 5, p.y + 5, p.w - 10, p.h - 10);
        ctx.shadowBlur = 0;
    }
}

function draw() {
    ctx.fillStyle = '#031e08';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#0a3d1c';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let i = 0; i < H; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
    }

    for (const p of platforms) {
        if (p.type !== 'boundary') drawPlatform(p);
    }

    if (gameState === 'PLAY') {
        for (let i = 0; i < player.trail.length; i++) {
            const point = player.trail[i];
            const alpha = (i + 1) / player.trail.length * 0.4;
            ctx.fillStyle = 'rgba(28, 248, 93, ' + alpha + ')';
            const offset = (player.trail.length - i);
            ctx.fillRect(point.x + offset, point.y + offset, player.width - offset * 2, player.height - offset * 2);
        }

        ctx.fillStyle = player.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;

        let stretchX = 0;
        let stretchY = 0;
        if (!player.grounded) {
            stretchY = player.vy > 0 ? 4 : -4;
            stretchX = -Math.abs(stretchY) / 2;
        }

        ctx.beginPath();
        ctx.roundRect(player.x + stretchX / 2, player.y + stretchY / 2, player.width - stretchX, player.height - stretchY, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#031e08';
        const eyeOffsetX = (player.vx > 0) ? 4 : (player.vx < 0 ? -4 : 0);
        ctx.fillRect(player.x + 14 + eyeOffsetX, player.y + 6, 4, 4);
        ctx.fillRect(player.x + 6 + eyeOffsetX, player.y + 6, 4, 4);
    }

    if (flash > 0) {
        ctx.fillStyle = 'rgba(216, 255, 232, ' + (flash / 25) + ')';
        ctx.fillRect(0, 0, W, H);
        flash--;
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

buildLevelSelect();
loadLevel(0);
draw();
requestAnimationFrame(gameLoop);
