const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'bot.db'), (err) => {
            if (err) {
                console.error('❌ Erreur lors de l\'ouverture de la base de données:', err.message);
            } else {
                console.log('✅ Connecté à la base de données SQLite.');
            }
        });
        this.initTables();
    }

    initTables() {
        // Table pour la configuration des serveurs
        this.db.run(`
            CREATE TABLE IF NOT EXISTS guild_config (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                welcome_channel TEXT,
                log_channel TEXT,
                level_up_messages BOOLEAN DEFAULT 1,
                economy_enabled BOOLEAN DEFAULT 1,
                daily_reward INTEGER DEFAULT 100,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table pour les niveaux des utilisateurs
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                messages_sent INTEGER DEFAULT 0,
                last_xp_gain DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id)
            )
        `);

        // Table pour l'économie des utilisateurs
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_economy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                coins INTEGER DEFAULT 0,
                bank INTEGER DEFAULT 0,
                last_daily DATETIME,
                last_work DATETIME,
                total_earned INTEGER DEFAULT 0,
                total_spent INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id)
            )
        `);

        console.log('📊 Tables de base de données initialisées.');
    }

    // =================
    // CONFIGURATION SERVEUR
    // =================

    async getGuildConfig(guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM guild_config WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async setGuildConfig(guildId, config) {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(config).join(', ');
            const placeholders = Object.keys(config).map(() => '?').join(', ');
            const values = Object.values(config);

            this.db.run(
                `INSERT OR REPLACE INTO guild_config (guild_id, ${fields}, updated_at) 
                 VALUES (?, ${placeholders}, CURRENT_TIMESTAMP)`,
                [guildId, ...values],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // =================
    // SYSTÈME DE NIVEAUX
    // =================

    async getUserLevel(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_levels WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { xp: 0, level: 1, messages_sent: 0 });
                }
            );
        });
    }

    async addXP(userId, guildId, xpAmount) {
        return new Promise((resolve, reject) => {
            // Vérifier le cooldown (1 minute entre les gains d'XP)
            const now = new Date().toISOString();
            const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

            this.db.get(
                'SELECT * FROM user_levels WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Vérifier le cooldown
                    if (row && row.last_xp_gain && row.last_xp_gain > oneMinuteAgo) {
                        resolve({ levelUp: false, newLevel: row.level });
                        return;
                    }

                    const currentXP = row ? row.xp : 0;
                    const currentLevel = row ? row.level : 1;
                    const messagesSent = row ? row.messages_sent + 1 : 1;
                    
                    const newXP = currentXP + xpAmount;
                    const newLevel = Math.floor(0.1 * Math.sqrt(newXP)) + 1;
                    const levelUp = newLevel > currentLevel;

                    this.db.run(
                        `INSERT OR REPLACE INTO user_levels 
                         (user_id, guild_id, xp, level, messages_sent, last_xp_gain, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [userId, guildId, newXP, newLevel, messagesSent, now],
                        function(err) {
                            if (err) reject(err);
                            else resolve({ 
                                levelUp, 
                                newLevel, 
                                newXP, 
                                previousLevel: currentLevel 
                            });
                        }
                    );
                }
            );
        });
    }

    async getTopLevels(guildId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?',
                [guildId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // =================
    // SYSTÈME D'ÉCONOMIE
    // =================

    async getUserEconomy(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { coins: 0, bank: 0 });
                }
            );
        });
    }

    async addCoins(userId, guildId, amount, reason = 'Unknown') {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const currentCoins = row ? row.coins : 0;
                    const currentBank = row ? row.bank : 0;
                    const totalEarned = row ? row.total_earned + Math.max(0, amount) : Math.max(0, amount);
                    const totalSpent = row ? row.total_spent + Math.max(0, -amount) : Math.max(0, -amount);

                    this.db.run(
                        `INSERT OR REPLACE INTO user_economy 
                         (user_id, guild_id, coins, bank, total_earned, total_spent, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [userId, guildId, currentCoins + amount, currentBank, totalEarned, totalSpent],
                        function(err) {
                            if (err) reject(err);
                            else resolve({ 
                                newBalance: currentCoins + amount,
                                change: amount 
                            });
                        }
                    );
                }
            );
        });
    }

    async canClaimDaily(userId, guildId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT last_daily FROM user_economy WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!row || !row.last_daily) {
                        resolve(true);
                        return;
                    }

                    const lastDaily = new Date(row.last_daily);
                    const now = new Date();
                    const timeDiff = now - lastDaily;
                    const hoursLeft = 24 - (timeDiff / (1000 * 60 * 60));

                    resolve(hoursLeft <= 0 ? true : { hoursLeft: Math.ceil(hoursLeft) });
                }
            );
        });
    }

    async claimDaily(userId, guildId, amount) {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            
            this.db.get(
                'SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?',
                [userId, guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const currentCoins = row ? row.coins : 0;
                    const currentBank = row ? row.bank : 0;
                    const totalEarned = row ? row.total_earned + amount : amount;

                    this.db.run(
                        `INSERT OR REPLACE INTO user_economy 
                         (user_id, guild_id, coins, bank, total_earned, last_daily, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [userId, guildId, currentCoins + amount, currentBank, totalEarned, now],
                        function(err) {
                            if (err) reject(err);
                            else resolve({ 
                                newBalance: currentCoins + amount,
                                claimed: amount 
                            });
                        }
                    );
                }
            );
        });
    }

    async getTopEconomy(guildId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM user_economy WHERE guild_id = ? ORDER BY (coins + bank) DESC LIMIT ?',
                [guildId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    // Fermer la base de données proprement
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else {
                    console.log('🔒 Base de données fermée.');
                    resolve();
                }
            });
        });
    }
}

module.exports = Database;