const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "bot.db"), (err) => {
      if (err) {
        console.error(
          "❌ Erreur lors de l'ouverture de la base de données:",
          err.message
        );
      } else {
        console.log("✅ Connecté à la base de données SQLite.");
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

    // Table pour les sessions de vocal
    this.db.run(`
            CREATE TABLE IF NOT EXISTS voice_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                duration_minutes INTEGER,
                xp_gained INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id, start_time)
            )
        `);

    console.log("📊 Tables de base de données initialisées.");
  }

  // =================
  // CONFIGURATION SERVEUR
  // =================

  async getGuildConfig(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM guild_config WHERE guild_id = ?",
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
      const fields = Object.keys(config).join(", ");
      const placeholders = Object.keys(config)
        .map(() => "?")
        .join(", ");
      const values = Object.values(config);

      this.db.run(
        `INSERT OR REPLACE INTO guild_config (guild_id, ${fields}, updated_at) 
                 VALUES (?, ${placeholders}, CURRENT_TIMESTAMP)`,
        [guildId, ...values],
        function (err) {
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
        "SELECT * FROM user_levels WHERE user_id = ? AND guild_id = ?",
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
        "SELECT * FROM user_levels WHERE user_id = ? AND guild_id = ?",
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
            function (err) {
              if (err) reject(err);
              else
                resolve({
                  levelUp,
                  newLevel,
                  newXP,
                  previousLevel: currentLevel,
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
        "SELECT * FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?",
        [guildId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async startVoiceSession(userId, guildId, channelId = null) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db.run(
        `INSERT OR REPLACE INTO voice_sessions 
             (user_id, guild_id, channel_id, start_time, created_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, guildId, channelId || "unknown", now],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async endVoiceSession(userId, guildId) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      // Trouver la session active
      this.db.get(
        "SELECT * FROM voice_sessions WHERE user_id = ? AND guild_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1",
        [userId, guildId],
        (err, session) => {
          if (err) {
            reject(err);
            return;
          }

          if (!session) {
            resolve(null);
            return;
          }

          const startTime = new Date(session.start_time);
          const endTime = new Date();
          const durationMs = endTime - startTime;
          const durationMinutes = Math.floor(durationMs / (1000 * 60));

          // Minimum 1 minute pour gagner de l'XP
          if (durationMinutes < 1) {
            // Mettre à jour la session sans donner d'XP
            this.db.run(
              "UPDATE voice_sessions SET end_time = ?, duration_minutes = ? WHERE id = ?",
              [now, durationMinutes, session.id],
              () =>
                resolve({
                  xpGained: 0,
                  timeSpent: this.formatDuration(durationMinutes),
                })
            );
            return;
          }

          // Calculer l'XP: 5 XP par minute, maximum 300 XP par session (1 heure)
          const baseXP = Math.min(durationMinutes * 5, 300);
          // Bonus aléatoire de 0-20%
          const bonus = Math.floor(Math.random() * 0.2 * baseXP);
          const totalXPGained = baseXP + bonus;

          // Mettre à jour la session
          this.db.run(
            "UPDATE voice_sessions SET end_time = ?, duration_minutes = ?, xp_gained = ? WHERE id = ?",
            [now, durationMinutes, totalXPGained, session.id],
            (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Ajouter l'XP au système de niveaux
              this.addXP(userId, guildId, totalXPGained)
                .then((result) => {
                  resolve({
                    xpGained: totalXPGained,
                    timeSpent: this.formatDuration(durationMinutes),
                    totalXP: result.newXP,
                    levelUp: result.levelUp,
                    newLevel: result.newLevel,
                    previousLevel: result.previousLevel,
                  });
                })
                .catch(reject);
            }
          );
        }
      );
    });
  }

  async getVoiceStats(userId, guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
                COUNT(*) as total_sessions,
                COALESCE(SUM(duration_minutes), 0) as total_minutes,
                COALESCE(SUM(xp_gained), 0) as total_voice_xp,
                COALESCE(AVG(duration_minutes), 0) as avg_session_length
             FROM voice_sessions 
             WHERE user_id = ? AND guild_id = ? AND end_time IS NOT NULL`,
        [userId, guildId],
        (err, rows) => {
          if (err) reject(err);
          else
            resolve(
              rows[0] || {
                total_sessions: 0,
                total_minutes: 0,
                total_voice_xp: 0,
                avg_session_length: 0,
              }
            );
        }
      );
    });
  }

  async getTopVoiceTime(guildId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
                user_id,
                SUM(duration_minutes) as total_minutes,
                SUM(xp_gained) as total_voice_xp,
                COUNT(*) as sessions_count
             FROM voice_sessions 
             WHERE guild_id = ? AND end_time IS NOT NULL
             GROUP BY user_id 
             ORDER BY total_minutes DESC 
             LIMIT ?`,
        [guildId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Méthode utilitaire pour formater la durée
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      let result = `${hours} heure${hours > 1 ? "s" : ""}`;
      if (remainingMinutes > 0) {
        result += ` et ${remainingMinutes} minute${
          remainingMinutes > 1 ? "s" : ""
        }`;
      }
      return result;
    }
  }

  // Nettoyer les sessions vocales abandonnées (à appeler périodiquement)
  async cleanupAbandonedVoiceSessions() {
    return new Promise((resolve, reject) => {
      // Sessions qui ont commencé il y a plus de 12 heures sans fin
      const twelveHoursAgo = new Date(
        Date.now() - 12 * 60 * 60 * 1000
      ).toISOString();

      this.db.run(
        "UPDATE voice_sessions SET end_time = start_time, duration_minutes = 0, xp_gained = 0 WHERE end_time IS NULL AND start_time < ?",
        [twelveHoursAgo],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
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
        "SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?",
        [userId, guildId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { coins: 0, bank: 0 });
        }
      );
    });
  }

  async addCoins(userId, guildId, amount, reason = "Unknown") {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?",
        [userId, guildId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const currentCoins = row ? row.coins : 0;
          const currentBank = row ? row.bank : 0;
          const totalEarned = row
            ? row.total_earned + Math.max(0, amount)
            : Math.max(0, amount);
          const totalSpent = row
            ? row.total_spent + Math.max(0, -amount)
            : Math.max(0, -amount);

          this.db.run(
            `INSERT OR REPLACE INTO user_economy 
                         (user_id, guild_id, coins, bank, total_earned, total_spent, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              userId,
              guildId,
              currentCoins + amount,
              currentBank,
              totalEarned,
              totalSpent,
            ],
            function (err) {
              if (err) reject(err);
              else
                resolve({
                  newBalance: currentCoins + amount,
                  change: amount,
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
        "SELECT last_daily FROM user_economy WHERE user_id = ? AND guild_id = ?",
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
          const hoursLeft = 24 - timeDiff / (1000 * 60 * 60);

          resolve(hoursLeft <= 0 ? true : { hoursLeft: Math.ceil(hoursLeft) });
        }
      );
    });
  }

  async claimDaily(userId, guildId, amount) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db.get(
        "SELECT * FROM user_economy WHERE user_id = ? AND guild_id = ?",
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
            [
              userId,
              guildId,
              currentCoins + amount,
              currentBank,
              totalEarned,
              now,
            ],
            function (err) {
              if (err) reject(err);
              else
                resolve({
                  newBalance: currentCoins + amount,
                  claimed: amount,
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
        "SELECT * FROM user_economy WHERE guild_id = ? ORDER BY (coins + bank) DESC LIMIT ?",
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
          console.log("🔒 Base de données fermée.");
          resolve();
        }
      });
    });
  }
}

module.exports = Database;
