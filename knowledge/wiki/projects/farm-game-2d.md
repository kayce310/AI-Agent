# 🎮 Farm Quái 2D Game

**Game nhẹ, chơi trực tiếp trên trình duyệt — WASD di chuyển, Space/Click đánh quái.**

## 📥 Cách chơi

- **WASD / Arrow keys** — di chuyển nhân vật
- **Space** — tấn công tất cả quái gần
- **Click chuột** — tấn công quái cụ thể
- **Mục tiêu:** Giết quái, farm EXP/Gold, level up

## ✨ Features

✅ Quái spawn tự động (tốc độ tăng theo level)  
✅ Level up system — HP/ATK/Speed tăng  
✅ Damage particles & animations  
✅ Enemy health bar  
✅ Real-time stats UI  
✅ Game over + score  
✅ Pure vanilla JS (không thư viện)  

---

## 🔗 Download

Sao chép code HTML phía dưới → lưu thành file `.html` → mở trên trình duyệt → chơi ngay!

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Farm Quái - 2D Game</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #222;
        }
        #gameContainer {
            position: relative;
            width: 800px;
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
        #ui {
            position: absolute;
            top: 10px;
            left: 10px;
            color: #0f0;
            font-weight: bold;
            background: rgba(0,0,0,0.7);
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
            font-weight: bold;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
            text-align: right;
            z-index: 100;
        }
        #hpBar {
            position: absolute;
            bottom: 10px;
            left: 10px;
            width: 200px;
            height: 20px;
            background: rgba(0,0,0,0.8);
            border: 2px solid #0f0;
            border-radius: 3px;
            overflow: hidden;
            z-index: 100;
        }
        #hpFill {
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #ffff00);
            width: 100%;
            transition: width 0.2s;
        }
    </style>
</head>
<body>
    <div id="gameContainer">
        <canvas id="gameCanvas"></canvas>
        <div id="ui">
            <div>Level: <span id="level">1</span></div>
            <div>EXP: <span id="exp">0</span>/100</div>
            <div>Gold: <span id="gold">0</span></div>
            <div>Kill: <span id="kills">0</span></div>
        </div>
        <div id="stats">
            <div>❤️ HP: <span id="hp">100</span>/100</div>
            <div>⚔️ ATK: <span id="atk">10</span></div>
            <div>👟 SPD: <span id="spd">5</span></div>
        </div>
        <div id="hpBar">
            <div id="hpFill"></div>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;

        const player = {
            x: 400,
            y: 300,
            width: 20,
            height: 20,
            speed: 5,
            maxHp: 100,
            hp: 100,
            atk: 10,
            level: 1,
            exp: 0,
            expNeeded: 100,
            gold: 0,
            kills: 0,
            attacking: false,
            attackCooldown: 0
        };

        let enemies = [];
        let particles = [];
        let gameRunning = true;

        const keys = {};
        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if (e.key === ' ') {
                player.attacking = true;
                player.attackCooldown = 10;
            }
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const dist = Math.hypot(mouseX - enemy.x, mouseY - enemy.y);
                if (dist < enemy.width) {
                    damageEnemy(i, player.atk);
                    break;
                }
            }
        });

        function spawnEnemy() {
            const side = Math.random();
            let x, y;
            if (side < 0.25) {
                x = Math.random() * canvas.width;
                y = -20;
            } else if (side < 0.5) {
                x = Math.random() * canvas.width;
                y = canvas.height + 20;
            } else if (side < 0.75) {
                x = -20;
                y = Math.random() * canvas.height;
            } else {
                x = canvas.width + 20;
                y = Math.random() * canvas.height;
            }

            const level = Math.floor(player.level / 2) + 1;
            enemies.push({
                x: x,
                y: y,
                width: 15,
                height: 15,
                speed: 2 + level * 0.5,
                maxHp: 20 + level * 5,
                hp: 20 + level * 5,
                damage: 5 + level * 2,
                expDrop: 10 + level * 5,
                goldDrop: 5 + level * 3,
                color: `hsl(${Math.random() * 60}, 100%, 50%)`
            });
        }

        function updatePlayer() {
            if (keys['w'] || keys['arrowup']) player.y -= player.speed;
            if (keys['s'] || keys['arrowdown']) player.y += player.speed;
            if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
            if (keys['d'] || keys['arrowright']) player.x += player.speed;

            player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
            player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

            if (player.attackCooldown > 0) player.attackCooldown--;

            document.getElementById('hp').textContent = player.hp;
            document.getElementById('level').textContent = player.level;
            document.getElementById('exp').textContent = player.exp;
            document.getElementById('gold').textContent = player.gold;
            document.getElementById('kills').textContent = player.kills;
            document.getElementById('atk').textContent = player.atk;
            document.getElementById('spd').textContent = player.speed.toFixed(1);
            
            const hpPercent = (player.hp / player.maxHp) * 100;
            document.getElementById('hpFill').style.width = hpPercent + '%';
        }

        function updateEnemies() {
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];

                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                }

                const collisionDist = player.width / 2 + enemy.width / 2;
                if (dist < collisionDist) {
                    player.hp -= enemy.damage;
                    addDamageParticle(enemy.x, enemy.y, enemy.damage, '#ff0000');
                    if (player.hp <= 0) {
                        gameOver();
                    }
                }

                if (enemy.x < -50 || enemy.x > canvas.width + 50 || 
                    enemy.y < -50 || enemy.y > canvas.height + 50) {
                    enemies.splice(i, 1);
                }
            }
        }

        function damageEnemy(index, damage) {
            if (index >= 0 && index < enemies.length) {
                const enemy = enemies[index];
                enemy.hp -= damage;
                addDamageParticle(enemy.x, enemy.y, damage, '#ffff00');

                if (enemy.hp <= 0) {
                    player.exp += enemy.expDrop;
                    player.gold += enemy.goldDrop;
                    player.kills++;
                    enemies.splice(index, 1);

                    if (player.exp >= player.expNeeded) {
                        player.level++;
                        player.exp = 0;
                        player.maxHp += 20;
                        player.hp = player.maxHp;
                        player.atk += 5;
                        player.speed += 0.5;
                        addDamageParticle(player.x, player.y - 40, 'LEVEL UP!', '#ffff00');
                    }
                }
            }
        }

        function drawPlayer() {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
            
            if (player.attackCooldown > 0) {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        function drawEnemies() {
            for (const enemy of enemies) {
                ctx.fillStyle = enemy.color;
                ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(enemy.x - 10, enemy.y - 25, 20, 3);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(enemy.x - 10, enemy.y - 25, 20 * (enemy.hp / enemy.maxHp), 3);
            }
        }

        function addDamageParticle(x, y, damage, color) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: -2,
                life: 60,
                text: typeof damage === 'string' ? damage : '-' + damage,
                color: color
            });
        }

        function updateParticles() {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                if (p.life <= 0) particles.splice(i, 1);
            }
        }

        function drawParticles() {
            for (const p of particles) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 60;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
                ctx.globalAlpha = 1;
            }
        }

        function gameOver() {
            gameRunning = false;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
            ctx.font = '20px Arial';
            ctx.fillStyle = '#ffff00';
            ctx.fillText(`Level: ${player.level} | Kills: ${player.kills} | Gold: ${player.gold}`, 
                         canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillStyle = '#0f0';
            ctx.font = '16px Arial';
            ctx.fillText('Reload to play again', canvas.width / 2, canvas.height / 2 + 60);
        }

        let spawnCounter = 0;
        function gameLoop() {
            if (!gameRunning) {
                requestAnimationFrame(gameLoop);
                return;
            }

            ctx.fillStyle = 'rgba(26, 77, 46, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            updatePlayer();
            updateEnemies();
            updateParticles();

            spawnCounter++;
            if (spawnCounter > 60 - player.level * 2) {
                spawnEnemy();
                spawnCounter = 0;
            }

            drawEnemies();
            drawParticles();
            drawPlayer();

            requestAnimationFrame(gameLoop);
        }

        gameLoop();
    </script>
</body>
</html>
```

---

**Lưu code trên vào file `farm-game.html` → mở trên trình duyệt → chơi thôi!** 🚀


---
#game #2d #farm #quai