const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'START';
let animationFrameId;

const keys = { left: false, right: false, up: false };

const player = {
    x: 40,
    y: 480,
    width: 24,
    height: 24,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: 12.5,
    gravity: 0.6,
    friction: 0.8,
    grounded: false,
    color: '#1cf85d',
    trail: []
};

const platforms = [
    { x: -20, y: -1000, w: 20, h: 2000, type: 'boundary' },
    { x: 800, y: -1000, w: 20, h: 2000, type: 'boundary' },
    { x: 0, y: 580, w: 800, h: 20, type: 'lava', color: '#7dffb2' },
    { x: 20, y: 520, w: 100, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 180, y: 460, w: 120, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 380, y: 400, w: 90, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 560, y: 340, w: 120, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 380, y: 250, w: 100, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 180, y: 190, w: 120, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 40, y: 130, w: 80, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 250, y: 70, w: 120, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 500, y: 120, w: 80, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 650, y: 180, w: 130, h: 20, type: 'solid', color: '#0d4a24' },
    { x: 720, y: 100, w: 40, h: 80, type: 'goal', color: '#d8ffe8' }
];

function leaveSource() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'close-source' }, window.location.origin);
    }
}

document.getElementById('return-btn').addEventListener('click', leaveSource);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        leaveSource();
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
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    el.addEventListener('touchcancel', (e) => { e.preventDefault(); keys[key] = false; });
};
bindTouch('btn-left', 'left');
bindTouch('btn-right', 'right');
bindTouch('btn-jump', 'up');

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    resetPlayer();
    gameState = 'PLAY';
}

function resetGame() {
    document.getElementById('win-screen').style.display = 'none';
    resetPlayer();
    gameState = 'PLAY';
}

function resetPlayer() {
    player.x = 40;
    player.y = 480;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.trail = [];
}

function collides(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.width > b.x &&
           a.y < b.y + b.h &&
           a.y + a.height > b.y;
}

function update() {
    if (gameState !== 'PLAY') return;

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

    for (let p of platforms) {
        if (collides(player, p)) {
            if (p.type === 'lava') { resetPlayer(); return; }
            if (p.type === 'goal') { gameState = 'WIN'; document.getElementById('win-screen').style.display = 'flex'; return; }
            if (p.type === 'solid' || p.type === 'boundary') {
                if (player.vx > 0) player.x = p.x - player.width;
                else if (player.vx < 0) player.x = p.x + p.w;
                player.vx = 0;
            }
        }
    }

    if (keys.up && player.grounded) {
        player.vy = -player.jumpPower;
        player.grounded = false;
    }

    player.vy += player.gravity;
    if (player.vy > 15) player.vy = 15;

    player.y += player.vy;
    player.grounded = false;

    for (let p of platforms) {
        if (collides(player, p)) {
            if (p.type === 'lava') { resetPlayer(); return; }
            if (p.type === 'goal') { gameState = 'WIN'; document.getElementById('win-screen').style.display = 'flex'; return; }
            if (p.type === 'solid') {
                if (player.vy > 0) {
                    player.y = p.y - player.height;
                    player.vy = 0;
                    player.grounded = true;
                } else if (player.vy < 0) {
                    player.y = p.y + p.h;
                    player.vy = 0;
                }
            }
        }
    }

    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 8) player.trail.shift();
}

function draw() {
    ctx.fillStyle = '#031e08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#0a3d1c';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    for (let p of platforms) {
        if (p.type === 'boundary') continue;

        ctx.fillStyle = p.color;

        if (p.type === 'solid') {
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#1cf85d';
            ctx.fillRect(p.x, p.y, p.w, 4);
        } else if (p.type === 'lava') {
            const pulse = Math.sin(Date.now() / 200) * 5;
            ctx.shadowBlur = 15 + pulse;
            ctx.shadowColor = '#1cf85d';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#d8ffe8';
            ctx.fillRect(p.x, p.y, p.w, 3);
        } else if (p.type === 'goal') {
            const glow = Math.abs(Math.sin(Date.now() / 300)) * 20;
            ctx.shadowBlur = 20 + glow;
            ctx.shadowColor = '#1cf85d';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#f4fff8';
            ctx.fillRect(p.x + 5, p.y + 5, p.w - 10, p.h - 10);
            ctx.shadowBlur = 0;
        }
    }

    if (gameState === 'PLAY') {
        for (let i = 0; i < player.trail.length; i++) {
            const point = player.trail[i];
            const alpha = (i + 1) / player.trail.length * 0.4;
            ctx.fillStyle = `rgba(28, 248, 93, ${alpha})`;
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
}

function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

draw();
requestAnimationFrame(gameLoop);

// CSP forbids inline handlers (onclick="..."), so bind the buttons here.
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('replay-btn').addEventListener('click', resetGame);
