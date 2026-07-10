# 🎮 Game Farm 2D — Hệ Thống Chi Tiết & Implementation Guide

## 📋 Tổng Quan
Dựa trên các anime isekai top 2025-2026, mình tạo một **farming game 2D hybrid system** kết hợp:
- **Hell Mode's progression** (level, skill points)
- **Solo Leveling's rank system** (E-S tier)
- **Mushoku Tensei's monster diversity**
- **Resource farming mechanics**

---

## 🧟 MONSTER SYSTEM (Chi Tiết)

### 1. Monster Classification

#### **Tier E — Beginner (Cấp 1-5)**
```
Goblin Scout
├─ HP: 15
├─ ATK: 3
├─ DEF: 1
├─ Speed: 3
├─ Drop: 5 Gold + 10 EXP
└─ Special: None

Slime
├─ HP: 10
├─ ATK: 1
├─ DEF: 0
├─ Speed: 1
├─ Drop: 2 Gold + 5 EXP
└─ Special: Regenerate 1 HP/sec (passive)

Rat
├─ HP: 12
├─ ATK: 2
├─ DEF: 0
├─ Speed: 4
├─ Drop: 3 Gold + 8 EXP
└─ Special: Pack attack (x2 damage nếu nhóm ≥3)
```

#### **Tier D — Intermediate (Cấp 6-15)**
```
Orc Warrior
├─ HP: 40
├─ ATK: 8
├─ DEF: 3
├─ Speed: 2
├─ Drop: 25 Gold + 50 EXP
└─ Special: Heavy Swing (2x damage, cooldown 5s)

Dire Wolf
├─ HP: 35
├─ ATK: 10
├─ DEF: 2
├─ Speed: 5
├─ Drop: 30 Gold + 55 EXP
└─ Special: Bleed (DoT 2 damage/sec, 3s)

Skeleton Archer
├─ HP: 25
├─ ATK: 7
├─ DEF: 1
├─ Speed: 4
├─ Drop: 20 Gold + 40 EXP
└─ Special: Ranged attack (hit from 100px away)
```

#### **Tier C — Advanced (Cấp 16-30)**
```
Troll
├─ HP: 80
├─ ATK: 12
├─ DEF: 6
├─ Speed: 2
├─ Drop: 60 Gold + 120 EXP
├─ Loot: Troll Hide (material)
└─ Special: Regenerate 3 HP/sec + Stun attack (freeze 2s)

Wyvern
├─ HP: 70
├─ ATK: 14
├─ DEF: 4
├─ Speed: 6
├─ Drop: 80 Gold + 150 EXP
├─ Loot: Wyvern Scale (rare material)
└─ Special: Aerial attack + Fireball (AoE 50px radius)

Dark Elf
├─ HP: 50
├─ ATK: 11
├─ DEF: 3
├─ Speed: 5
├─ Drop: 70 Gold + 140 EXP
├─ Loot: Shadow Essence
└─ Special: Shadow Clone (decoy, 5s duration)
```

#### **Tier B — Boss (Cấp 31-45)**
```
Giant Spider
├─ HP: 150
├─ ATK: 18
├─ DEF: 5
├─ Speed: 3
├─ Drop: 150 Gold + 300 EXP
├─ Loot: Spider Fang (legendary material)
├─ Special: Web trap (reduce speed 50%, 4s)
└─ AI: Teleport away when HP < 30%

Dragon Whelp
├─ HP: 200
├─ ATK: 22
├─ DEF: 8
├─ Speed: 4
├─ Drop: 250 Gold + 500 EXP
├─ Loot: Dragon Scale (epic material)
├─ Special: Dragon Breath (cone AoE, 100px, 25 damage)
└─ AI: Fly up high, escape, return
```

#### **Tier S — Final Boss (Cấp 46+)**
```
Demon Lord
├─ HP: 500
├─ ATK: 35
├─ DEF: 15
├─ Speed: 5
├─ Drop: 500 Gold + 1000 EXP
├─ Loot: Demon Core (quest item) + Legendary Sword
├─ Special: 
│  ├─ Phase 1: Melee attacks
│  ├─ Phase 2 (HP<250): Magic spam + Summon minions
│  └─ Phase 3 (HP<100): Enrage (2x speed, 2x damage)
└─ AI: Complex behavior tree
```

---

## 📊 LEVELING SYSTEM

### Player Stats
```
Level: 1-50 (soft cap)
EXP Bar: 0-100 per level (scales with level)

Base Stats (Level 1):
├─ HP: 100
├─ Mana: 50
├─ ATK: 10
├─ DEF: 5
├─ Speed: 5
└─ INT: 5

Per Level Gain:
├─ HP: +20
├─ Mana: +10
├─ ATK: +2
├─ DEF: +1
├─ Speed: +0.5
└─ INT: +1 (for magic scaling)
```

### Skill Tree
```
Tier 1 (Levels 1-10): Basic Skills
├─ Power Strike: +50% damage for 1 hit (cost: 1 mana)
├─ Quick Step: +100% speed for 3s (cost: 5 mana)
├─ Life Drain: Heal 10 HP per hit (cost: 10 mana)
└─ Parry: Block 50% damage for 2s (cost: 0, cooldown 5s)

Tier 2 (Levels 11-25): Intermediate Skills
├─ Whirlwind: AoE attack in 50px radius (cost: 15 mana)
├─ Fireball: Ranged projectile, 40 damage (cost: 20 mana)
├─ Invulnerability Frame: 2s dodge all (cost: 25 mana)
└─ Summon Helper: Ally NPC for 30s (cost: 30 mana)

Tier 3 (Levels 26-50): Advanced Skills
├─ Meteor Storm: Multiple meteors from sky (cost: 50 mana)
├─ Time Slow: 50% enemy speed reduction, 5s (cost: 40 mana)
├─ Resurrection: Revive with 50% HP (cost: 100 mana, 1x per level)
└─ Berserk: 3x damage, 10s, but take 2x damage (cost: 60 mana)
```

---

## 💎 ITEM & LOOT SYSTEM

### Rarity Tiers
```
1. Common (40% drop chance)
   └─ White color, Basic items
   
2. Uncommon (30% drop chance)
   └─ Green color, +10% bonus to main stat
   
3. Rare (20% drop chance)
   └─ Blue color, +20% bonus + 1 special effect
   
4. Epic (8% drop chance)
   └─ Purple color, +30% bonus + 2 special effects
   
5. Legendary (2% drop chance)
   └─ Gold color, Unique items, +50% bonus + 3 special effects
```

### Equipment Types

#### **Weapons**
| Name | ATK | Type | Rarity | Special |
|------|-----|------|--------|---------|
| Iron Sword | +5 | Common | Common | None |
| Steel Blade | +12 | Uncommon | Uncommon | +10% crit |
| Dragon Fang | +25 | Rare | Rare | +15% lifesteal |
| Excalibur | +40 | Legendary | Legendary | Ignore DEF 50% |
| Shadow Dagger | +8 | Rare | Rare | +2 speed, bleed 3s |

#### **Armor**
| Name | DEF | Type | Rarity | Special |
|------|-----|------|--------|---------|
| Leather Armor | +3 | Common | Common | None |
| Iron Plate | +8 | Uncommon | Uncommon | +5% HP |
| Mithril Suit | +15 | Rare | Rare | +10% magic resist |
| Dragon Scale Mail | +25 | Epic | Epic | Reflect 10% damage |
| God's Plate | +40 | Legendary | Legendary | Damage immunity 2s/30s |

#### **Accessories**
| Name | Bonus | Type | Special |
|------|-------|------|---------|
| Ring of Strength | +3 ATK | Uncommon | None |
| Amulet of Speed | +2 Speed | Uncommon | +20% movement |
| Gem of Wisdom | +5 INT | Rare | Mana +20 |
| Crown of Kings | +10 All Stats | Epic | 2x EXP gain |
| Infinity Stone | +25 All Stats | Legendary | Passive: +1% damage/s |

### Consumables
```
Health Potion
├─ Restore: 30 HP
├─ Cost: 10 Gold
├─ Rarity: Common
└─ Stackable: Yes (99 max)

Mana Potion
├─ Restore: 20 Mana
├─ Cost: 15 Gold
├─ Rarity: Common
└─ Stackable: Yes (99 max)

Elixir of Strength
├─ Buff: +20% ATK for 60s
├─ Cost: 50 Gold
├─ Rarity: Uncommon
└─ Stackable: Yes (20 max)

Resurrection Scroll
├─ Effect: Revive at current location with 25% HP
├─ Cost: 200 Gold
├─ Rarity: Rare
└─ Stackable: Yes (5 max)

Legendary Essence
├─ Effect: +50% damage + 2x EXP for 300s
├─ Cost: 500 Gold
├─ Rarity: Epic
└─ Stackable: Yes (3 max)
```

### Materials & Crafting
```
Crafting System:
├─ Troll Hide (from Troll) → Armor upgrade
├─ Dragon Scale (from Wyvern) → Legendary weapon
├─ Spider Fang (from Spider) → Poison weapon
├─ Shadow Essence (from Dark Elf) → Dark magic item
└─ Demon Core (from Demon Lord) → Quest item / Ultimate unlock

Upgrade Mechanics:
├─ Common → Uncommon: 50 Gold + 3 Common materials
├─ Uncommon → Rare: 150 Gold + 5 Uncommon materials
├─ Rare → Epic: 300 Gold + 8 Rare materials
└─ Epic → Legendary: 500 Gold + 10 Epic materials + 1 Boss drop
```

---

## 🎯 PROGRESSION CURVE

### Expected Playtime to Max Level
```
Level 1-10: 15 minutes (tutorial phase)
Level 11-20: 30 minutes
Level 21-30: 45 minutes
Level 31-40: 60 minutes
Level 41-50: 90 minutes (boss farming phase)
────────────────────────────
TOTAL: ~4 hours to max level
```

### Money & Resource Farming
```
Early Game (Lv 1-15):
├─ Farm Goblins: 5-25 Gold/kill
├─ Time per kill: 5-10s
├─ Gold/hour: ~1,000-3,000
└─ Recommendation: Buy basic items

Mid Game (Lv 16-30):
├─ Farm Trolls/Wyverns: 60-80 Gold/kill
├─ Time per kill: 15-30s
├─ Gold/hour: ~5,000-8,000
└─ Recommendation: Upgrade equipment

Late Game (Lv 31-50):
├─ Farm Bosses: 150-500 Gold/kill
├─ Time per kill: 60-120s
├─ Gold/hour: ~4,500-30,000 (boss dependent)
└─ Recommendation: Farm rare materials
```

---

## 🎮 GAME MECHANICS

### Combat System
```
Real-time Action Combat:
├─ WASD/Arrow Keys: Move
├─ Mouse Click / Space: Attack
├─ 1-5 Keys: Use skills
├─ Hold Shift: Sprint (consume stamina)
└─ E: Use item from inventory

Collision Detection:
├─ Player vs Enemy: Take damage
├─ Player vs Wall: Can't pass
└─ Skill vs Enemy: Hit detection (pixel-perfect)
```

### Difficulty Scaling
```
Easy Mode (Beginner):
├─ Monster HP: -30%
├─ Monster Damage: -30%
├─ Gold Drop: -20%
└─ EXP Drop: -20%

Normal Mode (Default):
├─ Monster HP: 100%
├─ Monster Damage: 100%
├─ Gold Drop: 100%
└─ EXP Drop: 100%

Hard Mode (Veteran):
├─ Monster HP: +50%
├─ Monster Damage: +30%
├─ Gold Drop: +50%
└─ EXP Drop: +50%
```

### Spawn System
```
Spawn Algorithm:
├─ Monster spawn based on player level
├─ Tier E: Always available
├─ Tier D: Unlocks at Lv 6
├─ Tier C: Unlocks at Lv 16
├─ Tier B: Unlocks at Lv 31
└─ Tier S: Unlocks at Lv 46 (boss only)

Spawn Rate:
├─ Easy: 1 monster every 3s
├─ Normal: 1 monster every 2s
├─ Hard: 1 monster every 1s + elite variants
└─ Max monsters on screen: 20 (performance limit)
```

---

## 📈 ENDGAME CONTENT

### Boss Rush Mode
```
Challenge Series:
├─ Bronze: 5 Tier B bosses (reward: 200 Gold)
├─ Silver: 10 Tier B + 2 Tier S bosses (reward: 500 Gold)
├─ Gold: 15 bosses mixed tiers (reward: 1000 Gold)
└─ Platinum: Infinite boss spawns (leaderboard)

Time Limits:
├─ Bronze: 5 minutes
├─ Silver: 10 minutes
├─ Gold: 15 minutes
└─ Platinum: No limit (survival)
```

### Leaderboard
```
Track:
├─ Highest Level Reached
├─ Most Gold Farmed (per hour)
├─ Fastest Boss Kill (Demon Lord)
├─ Longest Survival Time
└─ Perfect Runs (0 damage taken)

Reward System:
├─ Top 1: 2x Gold for 1 hour
├─ Top 5: 1.5x Gold for 30 min
├─ Top 10: Special cosmetic unlock
└─ Seasonal reset (every 7 days)
```

---

## 🎨 UI/UX Elements

### HUD Display
```
Top-Left Corner (Player Stats):
├─ Level: 1
├─ EXP: 0/100
├─ HP: 100/100 (bar)
├─ Mana: 50/50 (bar)
└─ Gold: 0

Top-Right Corner (Current Objectives):
├─ Active Quest
├─ Monster Count
└─ Time Played

Bottom-Left (Equipment):
├─ Current Weapon
├─ Current Armor
├─ Accessories (x2 slots)
└─ Quick Items (Potion hotkeys)

Center-Bottom (Skill Bar):
├─ 5 active skills displayed
├─ Cooldown circles
└─ Mana cost indicator
```

### Menu System
```
Pause Menu:
├─ Resume Game
├─ Inventory (items, equipment, materials)
├─ Character Sheet (stats, level, skills)
├─ Settings (audio, graphics, difficulty)
└─ Quit to Menu

Shop Menu:
├─ Buy items with Gold
├─ Sell equipment for partial Gold
├─ Craft items (if materials available)
└─ Upgrade equipment (% success rate)
```

---

## 🔧 IMPLEMENTATION ROADMAP

### Phase 1: Core (Week 1)
- [x] Basic player movement
- [x] Monster spawning
- [x] Combat system (hit detection)
- [x] Simple leveling
- [ ] Health bars, UI

### Phase 2: Progression (Week 2)
- [ ] Skill tree
- [ ] Equipment system
- [ ] Item drops
- [ ] Gold economy
- [ ] Shop

### Phase 3: Content (Week 3)
- [ ] Boss battles
- [ ] Multiple monster types
- [ ] Difficulty modes
- [ ] Special effects (particles, sounds)
- [ ] Animations

### Phase 4: Polish (Week 4)
- [ ] Balance tweaking
- [ ] Leaderboard
- [ ] Save/Load system
- [ ] Performance optimization
- [ ] Mobile support

---

## 📌 Source & References
- Anime systems: Hell Mode, Solo Leveling, Mushoku Tensei
- Game design: Roguelike farming mechanics
- Last updated: 7/2026


---
#game #design #farming #monsters #level #items #crafting #progression