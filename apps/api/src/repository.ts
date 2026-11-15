import { and, asc, desc, eq, inArray, max, sql, type SQL } from "drizzle-orm";
import { LEVEL_IDS, type BestScore, type LeaderboardEntry, type PlayerGame, type Profile } from "@chopchop/shared";
import type { createDb } from "./db/client.js";
import { joueur, partie, versionRegles } from "./db/schema.js";

export type GameStatus = "en_cours" | "terminee" | "abandonnee";

export interface Game {
  id: string;
  userId: string;
  levelId: number;
  status: GameStatus;
  startedAt: Date;
  /** Rules version the game was started with; it is ranked in this version only. */
  versionId: number;
  /** Length of the game according to its rules version. */
  ruleDurationMs: number;
}

export interface Repository {
  getProfile(userId: string): Promise<Profile | null>;
  /** Creates a profile; an existing profile gets "already_set". */
  saveProfile(userId: string, pseudo: string): Promise<"saved" | "pseudo_taken" | "already_set">;
  /** Changes only this user's pseudo. Leaderboards also use it for past games. */
  updatePseudo(userId: string, pseudo: string): Promise<"saved" | "pseudo_taken" | "not_found">;
  /** True if nobody uses this pseudo yet (case-insensitive). */
  isPseudoAvailable(pseudo: string): Promise<boolean>;
  /** Finished games of a player on the playable levels, newest first. */
  playerGames(userId: string, limit: number): Promise<PlayerGame[]>;
  /**
   * Best score of a player on each level they have finished, ordered by level, across every rules
   * version: it may differ from their ranked record in the current version.
   */
  bestScores(userId: string): Promise<BestScore[]>;
  /**
   * Starts a game with the latest rules version. The user must have a profile.
   * A game still in progress for this user is abandoned: a player has at most one open game.
   */
  startGame(userId: string, levelId: number, startedAt: Date): Promise<Game>;
  getGame(gameId: string): Promise<Game | null>;
  /** Ends a game in progress. Returns null if it is not (or no longer) in progress. */
  finishGame(input: {
    gameId: string;
    userId: string;
    score: number;
    bestCombo: number;
    finishedAt: Date;
  }): Promise<{ rank: number; durationMs: number; bestScore: number; isRecord: boolean } | null>;
  abandonGame(gameId: string, userId: string, at: Date): Promise<boolean>;
  /** Leaderboard of a level in the current rules version. */
  top(levelId: number, limit: number): Promise<LeaderboardEntry[]>;
}

type Db = ReturnType<typeof createDb>["db"];

/** Game duration in whole milliseconds, computed in SQL. `rankedBestGames` uses the same formula. */
const durationMs = (p: typeof partie) =>
  sql<number>`(extract(epoch from (${p.dateFin} - ${p.dateDebut})) * 1000)::int`;

/** The rules version new games are started with and the public leaderboard shows. */
const currentVersion = sql`(select max(id_version) from version_regles)`;

/**
 * Leaderboard of a level in one rules version: one row per player (their best finished game), ranked.
 * Ordering (decision of 14 November 2026): score desc, then the first to reach it (oldest end date),
 * then game id. The duration is no longer a tie-breaker. It never ties, so `rank` is unique.
 * `top` and `finishGame` both use it so they always agree.
 * To be used inside a `with` clause: it defines the CTEs `best` and `ranked`.
 */
const rankedBestGames = (levelId: number, versionId: SQL | number) => sql`
  best as (
    select distinct on (p.id_joueur)
      p.id_joueur, p.id_partie, p.score_final, p.date_fin,
      (extract(epoch from (p.date_fin - p.date_debut)) * 1000)::int as duree_ms
    from partie p
    where p.id_niveau = ${levelId} and p.id_version = ${versionId} and p.statut = 'terminee'
    order by p.id_joueur, p.score_final desc, p.date_fin asc, p.id_partie asc
  ),
  ranked as (
    select b.*,
      row_number() over (order by b.score_final desc, b.date_fin asc, b.id_partie asc)::int as rank
    from best b
  )`;

const UNIQUE_VIOLATION = "23505";
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;
}

export function createRepository(db: Db): Repository {
  const loadGame = async (gameId: string): Promise<Game | null> => {
    const [row] = await db
      .select({ p: partie, dureeSecondes: versionRegles.dureePartieSecondes })
      .from(partie)
      .innerJoin(versionRegles, eq(versionRegles.idVersion, partie.idVersion))
      .where(eq(partie.idPartie, gameId));
    if (!row) return null;
    return {
      id: row.p.idPartie,
      userId: row.p.idJoueur,
      levelId: row.p.idNiveau,
      status: row.p.statut,
      startedAt: row.p.dateDebut,
      versionId: row.p.idVersion,
      ruleDurationMs: row.dureeSecondes * 1000,
    };
  };

  return {
    async getProfile(userId) {
      const [row] = await db.select().from(joueur).where(eq(joueur.idJoueur, userId));
      return row ? { id: row.idJoueur, pseudo: row.pseudo } : null;
    },

    async saveProfile(userId, pseudo) {
      try {
        const inserted = await db
          .insert(joueur)
          .values({ idJoueur: userId, pseudo })
          .onConflictDoNothing({ target: joueur.idJoueur })
          .returning({ id: joueur.idJoueur });
        return inserted.length > 0 ? "saved" : "already_set";
      } catch (err) {
        if (isUniqueViolation(err)) return "pseudo_taken";
        throw err;
      }
    },

    async updatePseudo(userId, pseudo) {
      try {
        const updated = await db
          .update(joueur)
          .set({ pseudo })
          .where(eq(joueur.idJoueur, userId))
          .returning({ id: joueur.idJoueur });
        return updated.length > 0 ? "saved" : "not_found";
      } catch (err) {
        // The unique index arbitrates concurrent claims, without a check-then-write race.
        if (isUniqueViolation(err)) return "pseudo_taken";
        throw err;
      }
    },

    async isPseudoAvailable(pseudo) {
      const rows = await db
        .select({ id: joueur.idJoueur })
        .from(joueur)
        .where(sql`lower(${joueur.pseudo}) = lower(${pseudo})`)
        .limit(1);
      return rows.length === 0;
    },

    async playerGames(userId, limit) {
      const duration = durationMs(partie);
      const rows = await db
        .select({
          gameId: partie.idPartie,
          levelId: partie.idNiveau,
          score: partie.scoreFinal,
          duration,
          finishedAt: partie.dateFin,
        })
        .from(partie)
        .where(
          and(
            eq(partie.idJoueur, userId),
            eq(partie.statut, "terminee"),
            // Levels 4 and 5 are kept in the data but hidden from the history.
            inArray(partie.idNiveau, [...LEVEL_IDS]),
          ),
        )
        .orderBy(desc(partie.dateFin), desc(partie.idPartie))
        .limit(limit);
      return rows.map((r) => ({
        gameId: r.gameId,
        levelId: r.levelId,
        score: r.score ?? 0,
        durationMs: Number(r.duration),
        finishedAt: (r.finishedAt ?? new Date(0)).toISOString(),
      }));
    },

    async bestScores(userId) {
      const rows = await db
        .select({ levelId: partie.idNiveau, score: max(partie.scoreFinal) })
        .from(partie)
        .where(and(eq(partie.idJoueur, userId), eq(partie.statut, "terminee")))
        .groupBy(partie.idNiveau)
        .orderBy(asc(partie.idNiveau));
      return rows.map((r) => ({ levelId: r.levelId, score: r.score ?? 0 }));
    },

    async startGame(userId, levelId, startedAt) {
      const gameId = await db.transaction(async (tx) => {
        await tx
          .update(partie)
          .set({ statut: "abandonnee", dateFin: startedAt })
          .where(and(eq(partie.idJoueur, userId), eq(partie.statut, "en_cours")));
        const [row] = await tx
          .insert(partie)
          .values({
            idJoueur: userId,
            idNiveau: levelId,
            idVersion: currentVersion,
            dateDebut: startedAt,
          })
          .returning({ id: partie.idPartie });
        if (!row) throw new Error("Insert returned no row");
        return row.id;
      });
      const game = await loadGame(gameId);
      if (!game) throw new Error("Game not found after insert");
      return game;
    },

    getGame: loadGame,

    async finishGame({ gameId, userId, score, bestCombo, finishedAt }) {
      // One transaction: if computing the rank fails, the game stays in progress and can be retried.
      return db.transaction(async (tx) => {
        const updated = await tx
          .update(partie)
          .set({ statut: "terminee", dateFin: finishedAt, scoreFinal: score, meilleurCombo: bestCombo })
          .where(and(eq(partie.idPartie, gameId), eq(partie.idJoueur, userId), eq(partie.statut, "en_cours")))
          .returning({ id: partie.idPartie, levelId: partie.idNiveau, versionId: partie.idVersion });
        const game = updated[0];
        if (!game) return null;

        // The rank is the one of the player's best game on this level, which may be an older one,
        // in the rules version of this game (an old-version game is ranked in its old version).
        const result = await tx.execute<{
          duration_ms: number;
          rank: number;
          best_score: number;
          is_record: boolean;
        }>(sql`
          with ${rankedBestGames(game.levelId, game.versionId)}
          select r.rank, r.score_final as best_score, (r.id_partie = ${gameId}) as is_record,
                 (select (extract(epoch from (g.date_fin - g.date_debut)) * 1000)::int
                  from partie g where g.id_partie = ${gameId}) as duration_ms
          from ranked r
          where r.id_joueur = ${userId}
        `);
        const row = result.rows[0];
        if (!row) throw new Error("Rank query returned no row");
        return {
          rank: Number(row.rank),
          durationMs: Number(row.duration_ms),
          bestScore: Number(row.best_score),
          isRecord: Boolean(row.is_record),
        };
      });
    },

    async abandonGame(gameId, userId, at) {
      const updated = await db
        .update(partie)
        .set({ statut: "abandonnee", dateFin: at })
        .where(and(eq(partie.idPartie, gameId), eq(partie.idJoueur, userId), eq(partie.statut, "en_cours")))
        .returning({ id: partie.idPartie });
      return updated.length > 0;
    },

    async top(levelId, limit) {
      const result = await db.execute<{
        rank: number;
        pseudo: string;
        score_final: number;
        duree_ms: number;
        date_fin: Date;
      }>(sql`
        with ${rankedBestGames(levelId, currentVersion)}
        select r.rank, j.pseudo, r.score_final, r.duree_ms, r.date_fin
        from ranked r
        join joueur j on j.id_joueur = r.id_joueur
        order by r.rank
        limit ${limit}
      `);
      return result.rows.map((r) => ({
        rank: Number(r.rank),
        pseudo: r.pseudo,
        score: Number(r.score_final),
        durationMs: Number(r.duree_ms),
        finishedAt: new Date(r.date_fin).toISOString(),
      }));
    },
  };
}
