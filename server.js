require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// DATABASE CONNECTION
// =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// =====================
// MODELS
// =====================
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  farmName: { type: String, default: 'আমার ফার্ম' },
  avatar: { type: String },
  coins: { type: Number, default: 100 },
  gems: { type: Number, default: 5 },
  tokens: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  lastLogin: { type: Date },
  loginStreak: { type: Number, default: 0 },
  totalLogins: { type: Number, default: 0 },
  totalHarvested: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  questsCompleted: { type: Number, default: 0 },
  badges: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const farmSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  plots: [{
    id: Number,
    status: { type: String, default: 'empty' },
    cropId: { type: String, default: null },
    plantedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null }
  }],
  plotLevel: { type: Number, default: 1 },
  warehouse: {
    level: { type: Number, default: 1 },
    capacity: { type: Number, default: 100 },
    items: { type: Map, of: Number, default: {} }
  },
  well: { level: { type: Number, default: 0 }, autoWater: { type: Boolean, default: false } },
  factory: { level: { type: Number, default: 0 } },
  cowShed: { level: { type: Number, default: 0 }, cows: { type: Number, default: 0 }, lastCollected: { type: Date, default: null } },
  chickenCoop: { level: { type: Number, default: 0 }, chickens: { type: Number, default: 0 }, lastCollected: { type: Date, default: null } },
  duckPond: { level: { type: Number, default: 0 }, ducks: { type: Number, default: 0 }, lastCollected: { type: Date, default: null } }
});

const questSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questId: { type: String, required: true },
  type: { type: String },
  title: { type: String },
  target: { type: Number },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  reward: { coins: { type: Number, default: 0 }, gems: { type: Number, default: 0 }, tokens: { type: Number, default: 0 }, xp: { type: Number, default: 0 } },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Farm = mongoose.model('Farm', farmSchema);
const Quest = mongoose.model('Quest', questSchema);

// =====================
// GAME DATA
// =====================
const CROPS = {
  wheat:      { id: 'wheat',      name: 'গম',        emoji: '🌾', growTime: 5*60*1000,        seedCost: 10,   sellPrice: 25,    xp: 5,   unlockLevel: 1  },
  corn:       { id: 'corn',       name: 'ভুট্টা',    emoji: '🌽', growTime: 15*60*1000,       seedCost: 30,   sellPrice: 80,    xp: 10,  unlockLevel: 1  },
  tomato:     { id: 'tomato',     name: 'টমেটো',     emoji: '🍅', growTime: 30*60*1000,       seedCost: 60,   sellPrice: 180,   xp: 20,  unlockLevel: 10 },
  strawberry: { id: 'strawberry', name: 'স্ট্রবেরি', emoji: '🍓', growTime: 60*60*1000,       seedCost: 120,  sellPrice: 400,   xp: 35,  unlockLevel: 10 },
  sunflower:  { id: 'sunflower',  name: 'সূর্যমুখী', emoji: '🌻', growTime: 4*60*60*1000,     seedCost: 500,  sellPrice: 2000,  xp: 80,  unlockLevel: 30 },
  grape:      { id: 'grape',      name: 'আঙুর',      emoji: '🍇', growTime: 12*60*60*1000,    seedCost: 2000, sellPrice: 10000, xp: 200, unlockLevel: 30 }
};

const PLOT_UPGRADES = {
  2: { plots: 6,  cost: { coins: 500,   gems: 10,  tokens: 2  } },
  3: { plots: 8,  cost: { coins: 2000,  gems: 30,  tokens: 5  } },
  4: { plots: 12, cost: { coins: 8000,  gems: 80,  tokens: 15 } },
  5: { plots: 20, cost: { coins: 30000, gems: 200, tokens: 50 } }
};

const ANIMALS = {
  cow:     { shed: 'cowShed',    unlockLevel: 25, levels: { 1: { count: 1, interval: 2*60*60*1000, cost: { coins: 5000,  gems: 10 } }, 2: { count: 2, interval: 2*60*60*1000, cost: { coins: 20000, gems: 50,  tokens: 10 } }, 3: { count: 4, interval: 2*60*60*1000, cost: { coins: 80000, gems: 150, tokens: 30 } } } },
  chicken: { shed: 'chickenCoop',unlockLevel: 5,  levels: { 1: { count: 2, interval: 1*60*60*1000, cost: { coins: 2000,  gems: 5  } }, 2: { count: 5, interval: 1*60*60*1000, cost: { coins: 10000, gems: 30,  tokens: 8  } }, 3: { count: 10,interval: 1*60*60*1000, cost: { coins: 50000, gems: 100, tokens: 25 } } } },
  duck:    { shed: 'duckPond',   unlockLevel: 15, levels: { 1: { count: 2, interval: 1.5*60*60*1000,cost:{ coins: 3000,  gems: 8  } }, 2: { count: 4, interval: 1.5*60*60*1000,cost:{ coins: 15000, gems: 40,  tokens: 10 } }, 3: { count: 8, interval: 1.5*60*60*1000,cost:{ coins: 60000, gems: 120, tokens: 30 } } } }
};

// =====================
// USER ROUTES
// =====================
const userRouter = express.Router();

userRouter.post('/login', async (req, res) => {
  try {
    const { telegramId, username, firstName, avatar } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId দরকার' });

    let user = await User.findOne({ telegramId });
    if (!user) {
      user = await User.create({ telegramId, username, firstName, avatar });
      const plots = Array.from({ length: 4 }, (_, i) => ({ id: i, status: 'empty', cropId: null, plantedAt: null, readyAt: null }));
      await Farm.create({ userId: telegramId, plots });
    }

    const now = new Date();
    let bonusCoins = 0, bonusGems = 0, streakUpdated = false;
    if (!user.lastLogin || (now - user.lastLogin) > 20*60*60*1000) {
      const isConsecutive = user.lastLogin && (now - user.lastLogin) < 48*60*60*1000;
      user.loginStreak = isConsecutive ? user.loginStreak + 1 : 1;
      user.totalLogins += 1;
      user.lastLogin = now;
      streakUpdated = true;
      bonusCoins = 50 + (user.loginStreak * 10);
      bonusGems = user.loginStreak % 7 === 0 ? 3 : 0;
      user.coins += bonusCoins;
      user.gems += bonusGems;
      await user.save();
    }

    res.json({ success: true, user, dailyBonus: streakUpdated ? { coins: bonusCoins, gems: bonusGems, streak: user.loginStreak } : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/profile/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.post('/farmname', async (req, res) => {
  try {
    const { telegramId, farmName } = req.body;
    await User.updateOne({ telegramId }, { farmName });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================
// FARM ROUTES
// =====================
const farmRouter = express.Router();

farmRouter.get('/:telegramId', async (req, res) => {
  try {
    const farm = await Farm.findOne({ userId: req.params.telegramId });
    if (!farm) return res.status(404).json({ error: 'ফার্ম পাওয়া যায়নি' });
    const now = new Date();
    farm.plots.forEach(plot => {
      if (plot.status === 'planted' && plot.readyAt && now >= plot.readyAt) plot.status = 'ready';
    });
    await farm.save();
    res.json({ success: true, farm });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

farmRouter.post('/plant', async (req, res) => {
  try {
    const { telegramId, plotId, cropId } = req.body;
    const crop = CROPS[cropId];
    if (!crop) return res.status(400).json({ error: 'ফসল পাওয়া যায়নি' });

    const user = await User.findOne({ telegramId });
    if (user.level < crop.unlockLevel) return res.status(400).json({ error: `লেভেল ${crop.unlockLevel} লাগবে` });
    if (user.coins < crop.seedCost) return res.status(400).json({ error: 'পর্যাপ্ত কয়েন নেই' });

    const farm = await Farm.findOne({ userId: telegramId });
    const plot = farm.plots.find(p => p.id === plotId);
    if (!plot || plot.status !== 'empty') return res.status(400).json({ error: 'প্লট খালি নেই' });

    user.coins -= crop.seedCost;
    await user.save();

    const now = new Date();
    plot.status = 'planted';
    plot.cropId = cropId;
    plot.plantedAt = now;
    plot.readyAt = new Date(now.getTime() + crop.growTime);
    farm.markModified('plots');
    await farm.save();

    res.json({ success: true, plot, readyAt: plot.readyAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

farmRouter.post('/harvest', async (req, res) => {
  try {
    const { telegramId, plotId } = req.body;
    const farm = await Farm.findOne({ userId: telegramId });
    const plot = farm.plots.find(p => p.id === plotId);
    if (!plot || plot.status !== 'ready') return res.status(400).json({ error: 'ফসল এখনো তৈরি হয়নি' });

    const crop = CROPS[plot.cropId];
    const totalItems = Array.from(farm.warehouse.items.values()).reduce((a, b) => a + b, 0);
    if (totalItems >= farm.warehouse.capacity) return res.status(400).json({ error: 'গুদামঘর ভর্তি!' });

    const current = farm.warehouse.items.get(plot.cropId) || 0;
    farm.warehouse.items.set(plot.cropId, current + 1);

    const harvestedCrop = plot.cropId;
    plot.status = 'empty';
    plot.cropId = null;
    plot.plantedAt = null;
    plot.readyAt = null;
    farm.markModified('plots');
    farm.markModified('warehouse.items');
    await farm.save();

    const user = await User.findOne({ telegramId });
    user.xp += crop.xp;
    user.totalHarvested += 1;
    await user.save();

    res.json({ success: true, crop: harvestedCrop, xpGained: crop.xp });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

farmRouter.post('/sell', async (req, res) => {
  try {
    const { telegramId, cropId, amount } = req.body;
    const crop = CROPS[cropId];
    if (!crop) return res.status(400).json({ error: 'ফসল পাওয়া যায়নি' });

    const farm = await Farm.findOne({ userId: telegramId });
    const current = farm.warehouse.items.get(cropId) || 0;
    if (current < amount) return res.status(400).json({ error: 'পর্যাপ্ত ফসল নেই' });

    farm.warehouse.items.set(cropId, current - amount);
    farm.markModified('warehouse.items');
    await farm.save();

    const earned = crop.sellPrice * amount;
    const user = await User.findOne({ telegramId });
    user.coins += earned;
    user.totalEarned += earned;
    await user.save();

    res.json({ success: true, earned, totalCoins: user.coins });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

farmRouter.post('/upgrade/plot', async (req, res) => {
  try {
    const { telegramId } = req.body;
    const farm = await Farm.findOne({ userId: telegramId });
    const user = await User.findOne({ telegramId });
    const nextLevel = farm.plotLevel + 1;
    const upgrade = PLOT_UPGRADES[nextLevel];
    if (!upgrade) return res.status(400).json({ error: 'সর্বোচ্চ লেভেলে আছেন' });
    if (user.coins < upgrade.cost.coins || user.gems < upgrade.cost.gems || user.tokens < upgrade.cost.tokens)
      return res.status(400).json({ error: 'পর্যাপ্ত রিসোর্স নেই' });

    user.coins -= upgrade.cost.coins;
    user.gems -= upgrade.cost.gems;
    user.tokens -= upgrade.cost.tokens;
    await user.save();

    for (let i = farm.plots.length; i < upgrade.plots; i++) {
      farm.plots.push({ id: i, status: 'empty', cropId: null, plantedAt: null, readyAt: null });
    }
    farm.plotLevel = nextLevel;
    farm.markModified('plots');
    await farm.save();

    res.json({ success: true, newPlotCount: upgrade.plots, level: nextLevel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

farmRouter.post('/upgrade/animal', async (req, res) => {
  try {
    const { telegramId, animalType } = req.body;
    const animalData = ANIMALS[animalType];
    if (!animalData) return res.status(400).json({ error: 'পশু পাওয়া যায়নি' });

    const user = await User.findOne({ telegramId });
    const farm = await Farm.findOne({ userId: telegramId });
    if (user.level < animalData.unlockLevel) return res.status(400).json({ error: `লেভেল ${animalData.unlockLevel} লাগবে` });

    const shedKey = animalData.shed;
    const currentLevel = farm[shedKey].level;
    const nextLevel = currentLevel + 1;
    const levelData = animalData.levels[nextLevel];
    if (!levelData) return res.status(400).json({ error: 'সর্বোচ্চ লেভেলে আছেন' });

    if (user.coins < levelData.cost.coins) return res.status(400).json({ error: 'পর্যাপ্ত কয়েন নেই' });
    if (levelData.cost.gems && user.gems < levelData.cost.gems) return res.status(400).json({ error: 'পর্যাপ্ত জেম নেই' });
    if (levelData.cost.tokens && user.tokens < levelData.cost.tokens) return res.status(400).json({ error: 'পর্যাপ্ত টোকেন নেই' });

    user.coins -= levelData.cost.coins;
    if (levelData.cost.gems) user.gems -= levelData.cost.gems;
    if (levelData.cost.tokens) user.tokens -= levelData.cost.tokens;
    await user.save();

    farm[shedKey].level = nextLevel;
    const countKey = animalType === 'cow' ? 'cows' : animalType === 'chicken' ? 'chickens' : 'ducks';
    farm[shedKey][countKey] = levelData.count;
    farm.markModified(shedKey);
    await farm.save();

    res.json({ success: true, animalType, newLevel: nextLevel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

farmRouter.post('/collect/animal', async (req, res) => {
  try {
    const { telegramId, animalType } = req.body;
    const animalData = ANIMALS[animalType];
    const farm = await Farm.findOne({ userId: telegramId });
    const shedKey = animalData.shed;
    const shed = farm[shedKey];
    if (shed.level === 0) return res.status(400).json({ error: 'ঘর আনলক হয়নি' });

    const levelData = animalData.levels[shed.level];
    const now = new Date();
    if (shed.lastCollected && (now - shed.lastCollected) < levelData.interval) {
      const minutes = Math.ceil((levelData.interval - (now - shed.lastCollected)) / 60000);
      return res.status(400).json({ error: `আরো ${minutes} মিনিট অপেক্ষা করুন` });
    }

    const countKey = animalType === 'cow' ? 'cows' : animalType === 'chicken' ? 'chickens' : 'ducks';
    const itemKey = animalType === 'cow' ? 'milk' : animalType === 'chicken' ? 'egg' : 'duck_egg';
    const current = farm.warehouse.items.get(itemKey) || 0;
    farm.warehouse.items.set(itemKey, current + shed[countKey]);
    farm[shedKey].lastCollected = now;
    farm.markModified(shedKey);
    farm.markModified('warehouse.items');
    await farm.save();

    res.json({ success: true, collected: { [itemKey]: shed[countKey] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================
// QUEST ROUTES
// =====================
const questRouter = express.Router();

const DAILY_QUESTS = [
  { questId: 'harvest_10', title: '১০টি ফসল কাটুন', target: 10, reward: { coins: 200, gems: 1, xp: 50 } },
  { questId: 'sell_5', title: '৫টি ফসল বিক্রি করুন', target: 5, reward: { coins: 150, xp: 30 } },
  { questId: 'login_daily', title: 'আজকে লগইন করুন', target: 1, reward: { coins: 100, gems: 1, xp: 20 } }
];

questRouter.get('/:telegramId', async (req, res) => {
  try {
    const now = new Date();
    const quests = await Quest.find({ userId: req.params.telegramId, expiresAt: { $gt: now } });
    res.json({ success: true, quests });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

questRouter.post('/generate/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(23, 59, 59, 999);

    for (const q of DAILY_QUESTS) {
      const exists = await Quest.findOne({ userId: telegramId, questId: q.questId, expiresAt: { $gt: now } });
      if (!exists) await Quest.create({ userId: telegramId, type: 'daily', expiresAt: tomorrow, ...q });
    }

    const quests = await Quest.find({ userId: telegramId, expiresAt: { $gt: now } });
    res.json({ success: true, quests });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

questRouter.post('/progress', async (req, res) => {
  try {
    const { telegramId, questId, amount } = req.body;
    const quest = await Quest.findOne({ userId: telegramId, questId, completed: false });
    if (!quest) return res.json({ success: false });

    quest.progress = Math.min(quest.progress + amount, quest.target);
    if (quest.progress >= quest.target) {
      quest.completed = true;
      const user = await User.findOne({ telegramId });
      user.coins += quest.reward.coins || 0;
      user.gems += quest.reward.gems || 0;
      user.tokens += quest.reward.tokens || 0;
      user.xp += quest.reward.xp || 0;
      user.questsCompleted += 1;
      await user.save();
    }
    await quest.save();
    res.json({ success: true, quest, completed: quest.completed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================
// LEADERBOARD ROUTES
// =====================
const leaderboardRouter = express.Router();

leaderboardRouter.get('/', async (req, res) => {
  try {
    const topUsers = await User.find()
      .sort({ totalEarned: -1 })
      .limit(10)
      .select('telegramId username firstName farmName totalEarned level badges');
    res.json({ success: true, leaderboard: topUsers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

leaderboardRouter.get('/rank/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    const rank = await User.countDocuments({ totalEarned: { $gt: user.totalEarned } });
    res.json({ success: true, rank: rank + 1, totalEarned: user.totalEarned });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================
// REGISTER ROUTES
// =====================
app.use('/api/user', userRouter);
app.use('/api/farm', farmRouter);
app.use('/api/quest', questRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.get('/', (req, res) => res.json({ status: 'Farming Game API Running 🌾' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
