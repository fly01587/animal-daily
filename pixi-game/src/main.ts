import { Application, Color, Container, Graphics, Text } from "pixi.js";

type Vec2 = { x: number; y: number };

type Enemy = {
  view: Graphics;
  hp: number;
  speed: number;
};

type Bullet = {
  view: Graphics;
  velocity: Vec2;
  damage: number;
  lifetime: number;
};

type ExpOrb = {
  view: Graphics;
  amount: number;
};

type UpgradeId =
  | "attackSpeed"
  | "bulletDamage"
  | "bulletSpeed"
  | "moveSpeed"
  | "pickupRange"
  | "maxHp";

type PlayerStats = {
  moveSpeed: number;
  fireInterval: number;
  bulletDamage: number;
  bulletSpeed: number;
  bulletLifetime: number;
  pickupRadius: number;
  maxHp: number;
};

type UpgradeDef = {
  name: string;
  desc: string;
  apply: () => void;
};

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;

function createDefaultStats(): PlayerStats {
  return {
    moveSpeed: 270,
    fireInterval: 0.22,
    bulletDamage: 10,
    bulletSpeed: 480,
    bulletLifetime: 1.4,
    pickupRadius: 70,
    maxHp: 100
  };
}

const app = new Application();
await app.init({
  resizeTo: window,
  antialias: true,
  background: new Color("#0b1220")
});

const host = document.getElementById("app");
if (!host) {
  throw new Error("Missing #app container");
}
host.appendChild(app.canvas);

const stage = new Container();
app.stage.addChild(stage);

const uiLayer = new Container();
app.stage.addChild(uiLayer);

const arena = new Graphics()
  .roundRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 20)
  .fill(0x111827)
  .stroke({ color: 0x334155, width: 4 });
stage.addChild(arena);

const player = new Graphics().circle(0, 0, 18).fill(0x22c55e);
player.x = WORLD_WIDTH / 2;
player.y = WORLD_HEIGHT / 2;
stage.addChild(player);

const scoreText = new Text({
  text: "Kills: 0",
  style: {
    fill: 0xe2e8f0,
    fontSize: 22,
    fontWeight: "700"
  }
});
scoreText.x = 20;
scoreText.y = 20;
uiLayer.addChild(scoreText);

const stateText = new Text({
  text: "WASD 移动，自动攻击",
  style: {
    fill: 0x93c5fd,
    fontSize: 18,
    fontWeight: "600"
  }
});
stateText.x = 20;
stateText.y = 52;
uiLayer.addChild(stateText);

const hpText = new Text({
  text: "HP: 100",
  style: {
    fill: 0xfda4af,
    fontSize: 20,
    fontWeight: "700"
  }
});
hpText.x = 20;
hpText.y = 82;
uiLayer.addChild(hpText);

const levelText = new Text({
  text: "Lv 1  XP 0/30",
  style: {
    fill: 0x67e8f9,
    fontSize: 20,
    fontWeight: "700"
  }
});
levelText.x = 20;
levelText.y = 112;
uiLayer.addChild(levelText);

const statsText = new Text({
  text: "ATK 10  SPD 270  ASPD 4.5/s",
  style: {
    fill: 0xcbd5e1,
    fontSize: 16,
    fontWeight: "600"
  }
});
statsText.x = 20;
statsText.y = 142;
uiLayer.addChild(statsText);

const levelUpLayer = new Container();
levelUpLayer.visible = false;
uiLayer.addChild(levelUpLayer);

const levelUpDim = new Graphics();
levelUpLayer.addChild(levelUpDim);

const levelUpCard = new Graphics();
levelUpLayer.addChild(levelUpCard);

const levelUpTitle = new Text({
  text: "升级选择（按 1 / 2 / 3）",
  style: {
    fill: 0xfef08a,
    fontSize: 30,
    fontWeight: "800"
  }
});
levelUpLayer.addChild(levelUpTitle);

const levelUpChoices: Text[] = [];
for (let i = 0; i < 3; i += 1) {
  const option = new Text({
    text: "",
    style: {
      fill: 0xe2e8f0,
      fontSize: 22,
      fontWeight: "600",
      wordWrap: true,
      wordWrapWidth: 640
    }
  });
  levelUpChoices.push(option);
  levelUpLayer.addChild(option);
}

const keys = new Set<string>();
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (isLevelUpActive) {
    if (key === "1" || key === "2" || key === "3") {
      chooseUpgrade(Number(key) - 1);
    }
    return;
  }

  keys.add(key);
  if (key === "r" && isGameOver) {
    resetGame();
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

let isGameOver = false;
let isLevelUpActive = false;
let elapsed = 0;
let spawnTimer = 0;
let shootTimer = 0;
let score = 0;
let hp = createDefaultStats().maxHp;
let stats = createDefaultStats();
let level = 1;
let xp = 0;
let xpToNext = 30;
let pendingLevelUps = 0;
let upgradeChoices: UpgradeId[] = [];

const enemies: Enemy[] = [];
const bullets: Bullet[] = [];
const expOrbs: ExpOrb[] = [];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function spawnEnemy(): void {
  const enemy = new Graphics().circle(0, 0, 14).fill(0xfb7185);

  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) {
    enemy.x = Math.random() * WORLD_WIDTH;
    enemy.y = -20;
  } else if (edge === 1) {
    enemy.x = WORLD_WIDTH + 20;
    enemy.y = Math.random() * WORLD_HEIGHT;
  } else if (edge === 2) {
    enemy.x = Math.random() * WORLD_WIDTH;
    enemy.y = WORLD_HEIGHT + 20;
  } else {
    enemy.x = -20;
    enemy.y = Math.random() * WORLD_HEIGHT;
  }

  const enemyUnit: Enemy = {
    view: enemy,
    hp: 20 + Math.floor(elapsed / 25) * 4,
    speed: 70 + Math.random() * 45 + Math.min(60, elapsed * 1.4)
  };

  enemies.push(enemyUnit);
  stage.addChild(enemy);
}

function shootAtNearestEnemy(): void {
  if (enemies.length === 0) {
    return;
  }

  let nearest = enemies[0];
  let nearestDist = Number.POSITIVE_INFINITY;

  for (const enemy of enemies) {
    const d = distanceSq(player, enemy.view);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = enemy;
    }
  }

  const direction = normalize({
    x: nearest.view.x - player.x,
    y: nearest.view.y - player.y
  });

  const bulletView = new Graphics().circle(0, 0, 6).fill(0xfacc15);
  bulletView.x = player.x;
  bulletView.y = player.y;

  bullets.push({
    view: bulletView,
    velocity: {
      x: direction.x * stats.bulletSpeed,
      y: direction.y * stats.bulletSpeed
    },
    damage: stats.bulletDamage,
    lifetime: stats.bulletLifetime
  });

  stage.addChild(bulletView);
}

function spawnExpOrb(x: number, y: number, amount: number): void {
  const orb = new Graphics().circle(0, 0, 7).fill(0x60a5fa);
  orb.x = x;
  orb.y = y;
  expOrbs.push({ view: orb, amount });
  stage.addChild(orb);
}

function removeEnemy(index: number): void {
  const enemy = enemies[index];
  stage.removeChild(enemy.view);
  enemy.view.destroy();
  enemies.splice(index, 1);
}

function removeBullet(index: number): void {
  const bullet = bullets[index];
  stage.removeChild(bullet.view);
  bullet.view.destroy();
  bullets.splice(index, 1);
}

function removeExpOrb(index: number): void {
  const orb = expOrbs[index];
  stage.removeChild(orb.view);
  orb.view.destroy();
  expOrbs.splice(index, 1);
}

function setGameOver(): void {
  isGameOver = true;
  isLevelUpActive = false;
  levelUpLayer.visible = false;
  stateText.text = "游戏结束，按 R 重开";
  stateText.style.fill = 0xfda4af;
}

function resetGame(): void {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    removeEnemy(i);
  }
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    removeBullet(i);
  }
  for (let i = expOrbs.length - 1; i >= 0; i -= 1) {
    removeExpOrb(i);
  }

  elapsed = 0;
  spawnTimer = 0;
  shootTimer = 0;
  score = 0;
  stats = createDefaultStats();
  hp = stats.maxHp;
  isGameOver = false;
  isLevelUpActive = false;
  level = 1;
  xp = 0;
  xpToNext = 30;
  pendingLevelUps = 0;
  upgradeChoices = [];
  levelUpLayer.visible = false;

  player.x = WORLD_WIDTH / 2;
  player.y = WORLD_HEIGHT / 2;

  scoreText.text = "Kills: 0";
  hpText.text = `HP: ${stats.maxHp}`;
  levelText.text = "Lv 1  XP 0/30";
  statsText.text = "ATK 10  SPD 270  ASPD 4.5/s";
  stateText.text = "WASD 移动，自动攻击，升级时按 1/2/3";
  stateText.style.fill = 0x93c5fd;
}

function updatePlayer(dt: number): void {
  let dx = 0;
  let dy = 0;

  if (keys.has("w")) dy -= 1;
  if (keys.has("s")) dy += 1;
  if (keys.has("a")) dx -= 1;
  if (keys.has("d")) dx += 1;

  const input = normalize({ x: dx, y: dy });
  const speed = stats.moveSpeed;

  player.x = clamp(player.x + input.x * speed * dt, 18, WORLD_WIDTH - 18);
  player.y = clamp(player.y + input.y * speed * dt, 18, WORLD_HEIGHT - 18);
}

function updateEnemies(dt: number): void {
  for (const enemy of enemies) {
    const dir = normalize({ x: player.x - enemy.view.x, y: player.y - enemy.view.y });
    enemy.view.x += dir.x * enemy.speed * dt;
    enemy.view.y += dir.y * enemy.speed * dt;
  }
}

function updateBullets(dt: number): void {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.view.x += bullet.velocity.x * dt;
    bullet.view.y += bullet.velocity.y * dt;
    bullet.lifetime -= dt;

    if (
      bullet.lifetime <= 0 ||
      bullet.view.x < -50 ||
      bullet.view.x > WORLD_WIDTH + 50 ||
      bullet.view.y < -50 ||
      bullet.view.y > WORLD_HEIGHT + 50
    ) {
      removeBullet(i);
    }
  }
}

function addExperience(amount: number): void {
  xp += amount;
  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = Math.floor(xpToNext * 1.35 + 8);
    pendingLevelUps += 1;
  }

  levelText.text = `Lv ${level}  XP ${xp}/${xpToNext}`;

  if (!isLevelUpActive && pendingLevelUps > 0 && !isGameOver) {
    openLevelUpPanel();
  }
}

function updateExpOrbs(dt: number): void {
  const pickupRadiusSq = stats.pickupRadius * stats.pickupRadius;
  const collectDistSq = 22 * 22;

  for (let i = expOrbs.length - 1; i >= 0; i -= 1) {
    const orb = expOrbs[i];
    const distSq = distanceSq(player, orb.view);

    if (distSq <= collectDistSq) {
      addExperience(orb.amount);
      removeExpOrb(i);
      continue;
    }

    if (distSq <= pickupRadiusSq) {
      const dir = normalize({ x: player.x - orb.view.x, y: player.y - orb.view.y });
      const dist = Math.sqrt(distSq);
      const pullSpeed = 220 + dist * 2.5;
      orb.view.x += dir.x * pullSpeed * dt;
      orb.view.y += dir.y * pullSpeed * dt;
    }
  }
}

function resolveBulletEnemyCollisions(): void {
  for (let bi = bullets.length - 1; bi >= 0; bi -= 1) {
    const bullet = bullets[bi];

    for (let ei = enemies.length - 1; ei >= 0; ei -= 1) {
      const enemy = enemies[ei];
      const hitDist = 20;
      if (distanceSq(bullet.view, enemy.view) <= hitDist * hitDist) {
        enemy.hp -= bullet.damage;
        removeBullet(bi);

        if (enemy.hp <= 0) {
          const expX = enemy.view.x;
          const expY = enemy.view.y;
          removeEnemy(ei);
          score += 1;
          scoreText.text = `Kills: ${score}`;
          spawnExpOrb(expX, expY, 10);
        }

        break;
      }
    }
  }
}

function resolvePlayerEnemyCollisions(dt: number): void {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const overlapDist = 30;
    if (distanceSq(player, enemy.view) <= overlapDist * overlapDist) {
      hp -= 35 * dt;
      hpText.text = `HP: ${Math.max(0, Math.floor(hp))}`;
      if (hp <= 0) {
        hp = 0;
        hpText.text = "HP: 0";
        setGameOver();
        return;
      }
    }
  }
}

const upgradeDefinitions: Record<UpgradeId, UpgradeDef> = {
  attackSpeed: {
    name: "火力压制",
    desc: "攻速提升 15%",
    apply: () => {
      stats.fireInterval = Math.max(0.08, stats.fireInterval * 0.85);
    }
  },
  bulletDamage: {
    name: "重型弹药",
    desc: "子弹伤害 +4",
    apply: () => {
      stats.bulletDamage += 4;
    }
  },
  bulletSpeed: {
    name: "超速弹头",
    desc: "子弹速度 +90",
    apply: () => {
      stats.bulletSpeed += 90;
    }
  },
  moveSpeed: {
    name: "敏捷步伐",
    desc: "移动速度 +35",
    apply: () => {
      stats.moveSpeed += 35;
    }
  },
  pickupRange: {
    name: "吸附核心",
    desc: "经验拾取范围 +45",
    apply: () => {
      stats.pickupRadius += 45;
    }
  },
  maxHp: {
    name: "生存强化",
    desc: "最大生命 +20，并回复 20",
    apply: () => {
      stats.maxHp += 20;
      hp = Math.min(stats.maxHp, hp + 20);
      hpText.text = `HP: ${Math.max(0, Math.floor(hp))}`;
    }
  }
};

function sampleUpgradeChoices(): UpgradeId[] {
  const pool = Object.keys(upgradeDefinitions) as UpgradeId[];
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

function openLevelUpPanel(): void {
  isLevelUpActive = true;
  levelUpLayer.visible = true;
  upgradeChoices = sampleUpgradeChoices();
  stateText.text = "升级中：按 1/2/3 选择";
  stateText.style.fill = 0xfef08a;

  for (let i = 0; i < 3; i += 1) {
    const id = upgradeChoices[i];
    const option = upgradeDefinitions[id];
    levelUpChoices[i].text = `${i + 1}. ${option.name} - ${option.desc}`;
  }
}

function chooseUpgrade(index: number): void {
  if (!isLevelUpActive) {
    return;
  }

  const id = upgradeChoices[index];
  if (!id) {
    return;
  }

  upgradeDefinitions[id].apply();
  pendingLevelUps = Math.max(0, pendingLevelUps - 1);
  isLevelUpActive = false;
  levelUpLayer.visible = false;
  stateText.text = "WASD 移动，自动攻击，升级时按 1/2/3";
  stateText.style.fill = 0x93c5fd;
  updateStatsText();

  if (pendingLevelUps > 0) {
    openLevelUpPanel();
  }
}

function updateStatsText(): void {
  const shotsPerSec = (1 / stats.fireInterval).toFixed(1);
  statsText.text = `ATK ${stats.bulletDamage}  SPD ${Math.floor(stats.moveSpeed)}  ASPD ${shotsPerSec}/s`;
}

function layoutLevelUpPanel(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cardWidth = Math.min(760, w - 48);
  const cardHeight = 320;
  const cardX = (w - cardWidth) / 2;
  const cardY = (h - cardHeight) / 2;

  levelUpDim.clear().rect(0, 0, w, h).fill({ color: 0x020617, alpha: 0.65 });
  levelUpCard
    .clear()
    .roundRect(cardX, cardY, cardWidth, cardHeight, 18)
    .fill(0x0f172a)
    .stroke({ color: 0x334155, width: 3 });

  levelUpTitle.x = cardX + 26;
  levelUpTitle.y = cardY + 24;
  for (let i = 0; i < levelUpChoices.length; i += 1) {
    levelUpChoices[i].x = cardX + 26;
    levelUpChoices[i].y = cardY + 92 + i * 72;
    levelUpChoices[i].style.wordWrapWidth = cardWidth - 52;
  }
}

function layout(): void {
  const scale = Math.min(window.innerWidth / WORLD_WIDTH, window.innerHeight / WORLD_HEIGHT);
  stage.scale.set(scale);
  stage.x = (window.innerWidth - WORLD_WIDTH * scale) / 2;
  stage.y = (window.innerHeight - WORLD_HEIGHT * scale) / 2;
  layoutLevelUpPanel();
}

window.addEventListener("resize", layout);
layout();
resetGame();

app.ticker.add((ticker) => {
  const dt = ticker.deltaMS / 1000;

  if (isGameOver || isLevelUpActive) {
    return;
  }

  elapsed += dt;

  spawnTimer -= dt;
  const spawnInterval = Math.max(0.25, 1 - elapsed * 0.02);
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = spawnInterval;
  }

  shootTimer -= dt;
  if (shootTimer <= 0) {
    shootAtNearestEnemy();
    shootTimer = stats.fireInterval;
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateExpOrbs(dt);
  resolveBulletEnemyCollisions();
  resolvePlayerEnemyCollisions(dt);
  updateStatsText();
  levelText.text = `Lv ${level}  XP ${xp}/${xpToNext}`;
});
