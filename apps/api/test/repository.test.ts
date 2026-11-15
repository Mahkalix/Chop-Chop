import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { createRepository } from "../src/repository.js";

function updateRepository() {
  const returning = vi.fn().mockResolvedValue([{ id: "user-alice" }]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const db = { update: vi.fn().mockReturnValue({ set }) };
  const repository = createRepository(db as unknown as Parameters<typeof createRepository>[0]);
  return { repository, returning, where };
}

describe("repository pseudo updates", () => {
  it("restricts the SQL update to the authenticated player's id", async () => {
    const { repository, where } = updateRepository();
    expect(await repository.updatePseudo("user-alice", "Alicia")).toBe("saved");
    const query = new PgDialect().sqlToQuery(where.mock.calls[0]![0] as SQL);
    expect(query.sql).toBe('"joueur"."id_joueur" = $1');
    expect(query.params).toEqual(["user-alice"]);
  });

  it("reports a missing profile when no row is updated", async () => {
    const { repository, returning } = updateRepository();
    returning.mockResolvedValue([]);
    expect(await repository.updatePseudo("missing", "Alicia")).toBe("not_found");
  });

  it.each([{ code: "23505" }, { cause: { code: "23505" } }])(
    "translates PostgreSQL uniqueness errors, including Drizzle-wrapped errors: %j",
    async (error) => {
      const { repository, returning } = updateRepository();
      returning.mockRejectedValue(error);
      expect(await repository.updatePseudo("user-alice", "Bob")).toBe("pseudo_taken");
    },
  );

  it("propagates database failures unrelated to uniqueness", async () => {
    const { repository, returning } = updateRepository();
    const error = new Error("Database unavailable");
    returning.mockRejectedValue(error);
    await expect(repository.updatePseudo("user-alice", "Alicia")).rejects.toBe(error);
  });
});
