import { describe, expect, it } from "vitest";
import type { User } from "@/types";
import { visibleTeam } from "./visible-team";

const user = (id: string, isAdmin?: boolean) => ({ id, isAdmin }) as User;

describe("visibleTeam — los admins solo los ven los admins", () => {
  const users = [user("admin", true), user("lider", false), user("viejo")];

  it("quien no es admin no ve a los admins", () => {
    expect(visibleTeam(users, false).map((u) => u.id)).toEqual(["lider", "viejo"]);
  });

  it("un admin ve a todos", () => {
    expect(visibleTeam(users, true).map((u) => u.id)).toEqual(["admin", "lider", "viejo"]);
  });
});
