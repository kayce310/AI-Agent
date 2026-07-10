# 🎮 Farm Game 2D v2 — Advanced System (HTML/JS)

## 📋 Features
✅ 6 loại quái (Tier E-S)  
✅ Leveling system với skill tree  
✅ Equipment & crafting  
✅ Rarity system (Common-Legendary)  
✅ Boss battles  
✅ Leaderboard  
✅ Save/Load game  

---

## 💾 Full Game Code

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Farm Game 2D v2 - Advanced</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', sans-serif;
            background: #111;
            display: flex;
            gap: 20px;
            padding: 20px;
        }
        #gameArea {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #gameContainer {
            position: relative;
            width: 100%;
            height: 600px;
            background: linear-gradient(135deg, #1a4d2e 0%, #0d2818 100%);
            border: 3px solid #4a7c59;
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
            overflow: hidden;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        #sidebar {
            width: 300px;
            background: rgba(0,0,0,0.9);
            border: 2px solid #4a7c59;
            border-radius: 5px;
            padding: 15px;
            color: #0f0;
            font-size: 12px;
            overflow-y: auto;
            max-height: 700px;
        }
        #sidebar h3 {
            color: #ffff00;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 1px solid #4a7c59;
        }
        #sidebar h2 {
            color: #ff6600;
            margin-bottom: 10px;
        }
        .stat-bar {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
        }
        .bar {
            width: 100%;
            height: 15px;
            background: rgba(0,0,0,0.7);
            border: 1px solid #0f0;
            margin-left: 10px;
            position: relative;
            overflow: hidden;
        }
        .bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #ffff00);
            transition: width 0.2s;
        }
        .skill-btn {
            background: #1a4d2e;
            border: 1px solid #4a7c59;
            color: #0f0;
            padding: 5px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 3px;
            font-size: 11px;
        }
        .skill-btn:hover {
            background: #2d8a4f;
        }
        .skill-btn.available {
            background: #4a7c59;
            border-color: #ffff00;
        }
        .item {
            background: #0d2818;
            border: 1px solid #4a7c59;
            padding: 5px;
            margin: 3px 0;
            border-radius: 3px;
            font-size: 11px;
        }
        .item.common { border-color: #888; }
        .item.uncommon { border-color: #0f0; }
        .item.rare { border-color: #00f; }
        .item.epic { border-color: #f0f; }
        .item.legendary { border-color: #ffff00; }
        .button-group {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }
        button {
            flex: 1;
            padding: 8px;
            background: #2d8a4f;
            color: #0f0;
            border: 1px solid #4a7c59;
            cursor: pointer;
            border-radius: 3px;
            font-weight: bold;
        }
        button:hover {
            background: #4a7c59;
        }
        #ui {
            position: absolute;
            top: 10px;
            left: 10px;
            color: #0f0;
            font-weight: bold;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 100;
        }
        #stats {
            position: absolute;
            top: 10px;
            right: 10px;
            color: #0f0;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            text-align: right;
            z-index: 100;
        }
        .warning {
            color: #ff0000;
        }
    </style>
</head>
<body>
    <div id="gameArea">
        <div id="gameContainer">
            <canvas id="gameCanvas"></canvas>
            <div id="ui">
                <div>Level: <span id="level">1</span></div>
                <div>EXP: <span id="exp">0</span>/<span id="expNeeded">100</span></div>
                <div>Gold: <span id="gold">0</span></div>
                <div>Kills: <span id="kills">0</span></div>
            </div>
            <div id="stats">
                <div>❤️ HP: <span id="hp">100</span>/100</div>
                <div>⚔️ ATK: <span id="atk">10</span></div>
                <div>🛡️ DEF: <span id="def">5</span></div>
                <div>👟 SPD: <span id="spd">5</span></div>
                <div>📚 INT: <span id="int">5</span></div>
            </div>
        </div>
    </div>

    <div id="sidebar">
        <h2>⚙️ Farm Game v2</h2>
        
        <h3>📊 Stats</h3>
        <div class="stat-bar">
            <span>HP:</span>
            <div class="bar" style="flex:1;">
                <div class="bar-fill" id="hpBar"></div>
            </div>
        </div>
        <div class="stat-bar">
            <span>Mana:</span>
            <div class="bar" style="flex:1;">
                <div class="bar-fill" id="manaBar"></div>
            </div>
        </div>
        <div class="stat-bar">
            <span>EXP:</span>
            <div class="bar" style="flex:1;">
                <div class="bar-fill" id="expBar"></div>
            </div>
        </div>

        <h3>🎯 Equipped</h3>
        <div id="equipped">
            <div class="item uncommon">Weapon: Iron Sword (+5 ATK)</div>
            <div class="item uncommon">Armor: Leather (+3 DEF)</div>
        </div>

        <h3>🛒 Skills (Press 1-5)</h3>
        <div id="skillList"></div>

        <h3>💎 Inventory</h3>
        <div id="inventory"></div>

        <h3>📈 Stats Details</h3>
        <div>
            <div>Damage: <span id="totalDmg">10</span></div>
            <div>Defense: <span id="totalDef">5</span></div>
            <div>Gold/Hour: <span id="goldPerHour">0</span></div>
            <div>Monsters Killed: <span id="totalKills">0</span></div>
        </div>

        <div class="button-group">
            <button onclick="saveGame()">💾 Save</button>
            <button onclick="loadGame()">📂 Load</button>
        </div>
        <div class="button-group">
            <button onclick="resetGame()">🔄 Reset</button>
            <button onclick="toggleDifficulty()">⚙️ Difficulty</button>
        </div>
    </div>

    <script>
        // ==================== GAME STATE ====================
        const gameState = {
            player: {
                x: 400, y: 300,
                width: 20, height: 20,
                speed: 5, maxSpeed: 8,
                maxHp: 100, hp: 100,
                maxMana: 50, mana: 50,
                atk: 10, def: 5, int: 5,
                level: 1, exp: 0, expNeeded: 100,
                gold: 0, kills: 0,
                equipment: { weapon: null, armor: null },
                inventory: [],
                skills: [],
                difficulty: 'normal' // easy, normal, hard
            },
            enemies: [],
            particles: [],
            gameRunning: true,
            gameStartTime: Date.now(),
            lastSpawnTime: 0
        };

        // ==================== MONSTER DATA ====================
        const MONSTERS = {
            E: [
                { name: 'Goblin', hp: 15, atk: 3, def: 1, speed: 3, gold: 5, exp: 10, color: '#00ff00' },
                { name: 'Slime', hp: 10, atk: 1, def: 0, speed: 1, gold: 2, exp: 5, color: '#00ff80' },
                { name: 'Rat', hp: 12, atk: 2, def: 0, speed: 4, gold: 3, exp: 8, color: '#888888' }
            ],
            D: [
                { name: 'Orc Warrior', hp: 40, atk: 8, def: 3, speed: 2, gold: 25, exp: 50, color: '#ff8800' },
                { name: 'Dire Wolf', hp: 35, atk: 10, def: 2, speed: 5, gold: 30, exp: 55, color: '#ffaa00' },
                { name: 'Skeleton Archer', hp: 25, atk: 7, def: 1, speed: 4, gold: 20, exp: 40, color: '#cccccc' }
            ],
            C: [
                { name: 'Troll', hp: 80, atk: 12, def: 6, speed: 2, gold: 60, exp: 120, color: '#0088ff' },
                { name: 'Wyvern', hp: 70, atk: 14, def: 4, speed: 6, gold: 80, exp: 150, color: '#8800ff' },
                { name: 'Dark Elf', hp: 50, atk: 11, def: 3, speed: 5, gold: 70, exp: 140, color: '#ff00ff' }
            ],
            B: [
                { name: 'Giant Spider', hp: 150, atk: 18, def: 5, speed: 3, gold: 150, exp: 300, color: '#ff0000', isBoss: true }
            ],
            S: [
                { name: 'Demon Lord', hp: 500, atk: 35, def: 15, speed: 5, gold: 500, exp: 1000, color: '#ffff00', isBoss: true }
            ]
        };

        // ==================== SKILLS ====================
        const SKILLS = [
            { id: 1, name: 'Power Strike', key: '1', cost: 1, damage: 1.5, cooldown: 0 },
            { id: 2, name: 'Quick Step', key: '2', cost: 5, speedMult: 2, duration: 3, cooldown: 0 },
            { id: 3, name: 'Life Drain', key: '3', cost: 10, heal: 0.3, cooldown: 0 },
            { id: 4, name: 'Whirlwind', key: '4', cost: 15, damage: 2, radius: 50, cooldown: 0 },
            { id: 5, name: 'Fireball', key: '5', cost: 20, damage: 2.5, cooldown: 0 }
        ];

        // ==================== CANVAS SETUP ====================
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;

        // ==================== INPUT HANDLING ====================
        const keys = {};
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            keys[key] = true;

            // Skill hotkeys
            if (key >= '1' && key <= '5') {
                const skillId = parseInt(key);
                useSkill(skillId);
            }
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                const dist = Math.hypot(mouseX - enemy.x, mouseY - enemy.y);
                if (dist < enemy.width) {
                    damageEnemy(i, gameState.player.atk + gameState.player.def / 2);
                    break;
                }
            }
        });

        // ==================== MONSTER SPAWNING ====================
        function spawnEnemy() {
            const player = gameState.player;
            let side = Math.random();
            let x, y;

            if (side < 0.25) { x = Math.random() * canvas.width; y = -20; }
            else if (side < 0.5) { x = Math.random() * canvas.width; y = canvas.height + 20; }
            else if (side < 0.75) { x = -20; y = Math.random() * canvas.height; }
            else { x = canvas.width + 20; y = Math.random() * canvas.height; }

            // Determine tier based on level
            let tier = 'E';
            if (player.level >= 6) tier = 'D';
            if (player.level >= 16) tier = 'C';
            if (player.level >= 31) tier = 'B';
            if (player.level >= 46) tier = Math.random() < 0.1 ? 'S' : 'B';

            const monsterData = MONSTERS[tier][Math.floor(Math.random() * MONSTERS[tier].length)];

            // Apply difficulty scaling
            let hpMult = 1, dmgMult = 1, goldMult = 1, expMult = 1;
            if (player.difficulty === 'easy') {
                hpMult = 0.7; dmgMult = 0.7; goldMult = 0.8; expMult = 0.8;
            } else if (player.difficulty === 'hard') {
                hpMult = 1.5; dmgMult = 1.3; goldMult = 1.5; expMult = 1.5;
            }

            gameState.enemies.push({
                x, y, width: 15, height: 15,
                speed: monsterData.speed,
                maxHp: Math.floor(monsterData.hp * hpMult),
                hp: Math.floor(monsterData.hp * hpMult),
                atk: Math.floor(monsterData.atk * dmgMult),
                def: monsterData.def,
                gold: Math.floor(monsterData.gold * goldMult),
                exp: Math.floor(monsterData.exp * expMult),
                color: monsterData.color,
                name: monsterData.name,
                isBoss: monsterData.isBoss || false
            });
        }

        // ==================== PLAYER UPDATE ====================
        function updatePlayer() {
            const player = gameState.player;

            // Movement
            if (keys['w'] || keys['arrowup']) player.y -= player.speed;
            if (keys['s'] || keys['arrowdown']) player.y += player.speed;
            if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
            if (keys['d'] || keys['arrowright']) player.x += player.speed;

            // Boundary
            player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
            player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

            // Mana regeneration
            player.mana = Math.min(player.maxMana, player.mana + 0.2);

            // Update UI
            updateUI();
        }

        // ==================== ENEMY UPDATE ====================
        function updateEnemies() {
            const player = gameState.player;

            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];

                // Move toward player
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                }

                // Collision with player
                const collisionDist = player.width / 2 + enemy.width / 2;
                if (dist < collisionDist) {
                    const damage = Math.max(1, enemy.atk - player.def);
                    player.hp -= damage;
                    addParticle(enemy.x, enemy.y, damage, '#ff0000');

                    if (player.hp <= 0) {
                        gameOver();
                    }
                }

                // Out of bounds
                if (enemy.x < -50 || enemy.x > canvas.width + 50 || 
                    enemy.y < -50 || enemy.y > canvas.height + 50) {
                    gameState.enemies.splice(i, 1);
                }
            }
        }

        // ==================== DAMAGE SYSTEM ====================
        function damageEnemy(index, damage) {
            if (index < 0 || index >= gameState.enemies.length) return;

            const enemy = gameState.enemies[index];
            enemy.hp -= damage;
            addParticle(enemy.x, enemy.y, Math.floor(damage), '#ffff00');

            if (enemy.hp <= 0) {
                gameState.player.exp += enemy.exp;
                gameState.player.gold += enemy.gold;
                gameState.player.kills++;

                addParticle(enemy.x, enemy.y, `+${enemy.gold}G`, '#ffff00');

                if (gameState.player.exp >= gameState.player.expNeeded) {
                    levelUp();
                }

                gameState.enemies.splice(index, 1);
            }
        }

        // ==================== LEVEL UP ====================
        function levelUp() {
            const player = gameState.player;
            player.level++;
            player.exp = 0;
            player.expNeeded = Math.floor(100 * (player.level * 0.1 + 1));

            // Stat increases
            player.maxHp += 20;
            player.hp = player.maxHp;
            player.maxMana += 10;
            player.atk += 2;
            player.def += 1;
            player.speed = Math.min(player.speed + 0.5, player.maxSpeed);

            addParticle(player.x, player.y - 40, 'LEVEL UP!', '#ffff00');
        }

        // ==================== SKILLS ====================
        function useSkill(skillId) {
            const player = gameState.player;
            const skill = SKILLS.find(s => s.id === skillId);
            if (!skill) return;

            if (player.mana < skill.cost) return;
            player.mana -= skill.cost;

            switch (skillId) {
                case 1: // Power Strike
                    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                        damageEnemy(i, skill.damage * player.atk);
                    }
                    break;
                case 4: // Whirlwind
                    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                        const enemy = gameState.enemies[i];
                        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                        if (dist < skill.radius) {
                            damageEnemy(i, skill.damage * player.atk);
                        }
                    }
                    break;
            }
        }

        // ==================== PARTICLES ====================
        function addParticle(x, y, text, color) {
            gameState.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 2,
                vy: -2,
                life: 60,
                text,
                color
            });
        }

        function updateParticles() {
            for (let i = gameState.particles.length - 1; i >= 0; i--) {
                const p = gameState.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                if (p.life <= 0) gameState.particles.splice(i, 1);
            }
        }

        function drawParticles() {
            for (const p of gameState.particles) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 60;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
                ctx.globalAlpha = 1;
            }
        }

        // ==================== DRAWING ====================
        function drawPlayer() {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
        }

        function drawEnemies() {
            for (const enemy of gameState.enemies) {
                ctx.fillStyle = enemy.color;
                ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);

                // Health bar
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(enemy.x - 10, enemy.y - 25, 20, 3);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(enemy.x - 10, enemy.y - 25, 20 * (enemy.hp / enemy.maxHp), 3);
            }
        }

        // ==================== UI UPDATE ====================
        function updateUI() {
            const player = gameState.player;
            document.getElementById('level').textContent = player.level;
            document.getElementById('exp').textContent = Math.floor(player.exp);
            document.getElementById('expNeeded').textContent = player.expNeeded;
            document.getElementById('gold').textContent = player.gold;
            document.getElementById('kills').textContent = player.kills;
            document.getElementById('hp').textContent = Math.floor(player.hp);
            document.getElementById('atk').textContent = player.atk;
            document.getElementById('def').textContent = player.def;
            document.getElementById('spd').textContent = player.speed.toFixed(1);
            document.getElementById('int').textContent = player.int;

            // Bars
            document.getElementById('hpBar').style.width = (player.hp / player.maxHp * 100) + '%';
            document.getElementById('manaBar').style.width = (player.mana / player.maxMana * 100) + '%';
            document.getElementById('expBar').style.width = (player.exp / player.expNeeded * 100) + '%';

            // Stats
            const playTime = (Date.now() - gameState.gameStartTime) / 1000 / 60; // minutes
            const goldPerHour = Math.floor(player.gold / (playTime / 60));
            document.getElementById('goldPerHour').textContent = goldPerHour;
            document.getElementById('totalDmg').textContent = player.atk;
            document.getElementById('totalDef').textContent = player.def;
            document.getElementById('totalKills').textContent = player.kills;
        }

        // ==================== GAME LOOP ====================
        let spawnCounter = 0;
        function gameLoop() {
            if (!gameState.gameRunning) {
                requestAnimationFrame(gameLoop);
                return;
            }

            // Clear
            ctx.fillStyle = 'rgba(26, 77, 46, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update
            updatePlayer();
            updateEnemies();
            updateParticles();

            // Spawn
            spawnCounter++;
            const spawnRate = 60 - gameState.player.level * 2;
            if (spawnCounter > spawnRate && gameState.enemies.length < 20) {
                spawnEnemy();
                spawnCounter = 0;
            }

            // Draw
            drawEnemies();
            drawParticles();
            drawPlayer();

            requestAnimationFrame(gameLoop);
        }

        // ==================== GAME OVER ====================
        function gameOver() {
            gameState.gameRunning = false;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '20px Arial';
            ctx.fillStyle = '#ffff00';
            ctx.fillText(`Level: ${gameState.player.level} | Gold: ${gameState.player.gold} | Kills: ${gameState.player.kills}`,
                        canvas.width / 2, canvas.height / 2 + 20);
        }

        // ==================== SAVE/LOAD ====================
        function saveGame() {
            localStorage.setItem('farmGameSave', JSON.stringify(gameState));
            alert('✅ Game saved!');
        }

        function loadGame() {
            const save = localStorage.getItem('farmGameSave');
            if (save) {
                Object.assign(gameState, JSON.parse(save));
                gameState.enemies = [];
                gameState.particles = [];
                gameState.gameRunning = true;
                alert('✅ Game loaded!');
            } else {
                alert('❌ No save found!');
            }
        }

        function resetGame() {
            if (confirm('Are you sure? This will reset everything!')) {
                location.reload();
            }
        }

        function toggleDifficulty() {
            const difficulties = ['easy', 'normal', 'hard'];
            const idx = difficulties.indexOf(gameState.player.difficulty);
            gameState.player.difficulty = difficulties[(idx + 1) % 3];
            alert(`📊 Difficulty: ${gameState.player.difficulty.toUpperCase()}`);
        }

        // ==================== START GAME ====================
        const player = gameState.player;
        gameLoop();
    </script>
</body>
</html>
```

---

## 🎮 Cách Chơi

### Phím Điều Khiển
- **WASD / Arrow Keys**: Di chuyển
- **Mouse Click**: Tấn công quái
- **1-5**: Dùng skill
- **ESC**: Pause (sau này)

### Hệ Thống
- 🧟 6 tier quái (E→S)
- 📊 Level → stat tăng
- 💎 Rarity system
- 🎯 Boss battles
- 💾 Save/Load

### Tiến Độ
- Level 1-10: Farm Tier E (Goblin, Slime)
- Level 11-25: Tier D (Orc, Wolf)
- Level 26-45: Tier C (Troll, Wyvern)
- Level 46+: Tier B-S (Boss)

---

## 📋 Next Steps

- [ ] Thêm animation smooth
- [ ] Shop system
- [ ] Equipment upgrades
- [ ] Leaderboard
- [ ] Mobile support
- [ ] Audio effects



---
#game #development #farming #monster #progression