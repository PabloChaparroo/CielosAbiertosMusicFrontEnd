import { describe, expect, it } from "vitest";
import type { Setlist, User } from "@/types";
import { teamMemberOf } from "./team-members";
import { teamToWhatsapp } from "./team-whatsapp";
import { mapSetlist, type RawSetlist } from "../services/setlists.service";

const member = {
  id: "u1",
  name: "Josué Pérez",
  avatarColor: "#f90",
  initials: "JP",
  avatarKey: null,
};

describe("equipo de una lista sin el módulo Equipo (sin lista de usuarios)", () => {
  const setlist = { team: [member] } as Pick<Setlist, "team">;

  it("sin usuarios cargados, usa el integrante que viene con la lista", () => {
    expect(teamMemberOf("u1", setlist, [])?.name).toBe("Josué Pérez");
    expect(teamMemberOf("otro", setlist, [])).toBeUndefined();
  });

  it("con usuarios cargados, prefiere los datos completos", () => {
    const full = { ...member, name: "Josué P.", roles: [] } as unknown as User;
    expect(teamMemberOf("u1", setlist, [full])?.name).toBe("Josué P.");
  });

  it("'Copiar equipo' escribe los nombres también sin usuarios cargados", () => {
    const text = teamToWhatsapp(
      {
        title: "Domingo",
        teamIds: ["u1"],
        teamInstruments: { u1: ["Teclado"] },
        team: [member],
      } as unknown as Setlist,
      [],
    );
    expect(text).toContain("Teclado: Josué");
  });

  it("mapSetlist conserva los integrantes que vienen con la lista", () => {
    const raw = {
      id: "s",
      title: "Domingo",
      date: "2026-10-25T13:30:00.000Z",
      type: "Ensayo",
      leader: { id: "l" },
      team: [
        {
          id: "u1",
          name: "Josué Pérez",
          avatarColor: "#f90",
          initials: "JP",
          avatarKey: null,
          instruments: ["Voz"],
        },
      ],
      items: [],
    } as unknown as RawSetlist;
    const mapped = mapSetlist(raw);
    expect(mapped.teamIds).toEqual(["u1"]);
    expect(mapped.team).toEqual([{ ...member, instruments: ["Voz"] }]);
  });

  it("un backend viejo (solo ids) no rompe: team queda vacío", () => {
    const raw = {
      id: "s",
      title: "Domingo",
      date: "2026-10-25T13:30:00.000Z",
      type: "Ensayo",
      leader: { id: "l" },
      team: [{ id: "u1" }],
      items: [],
    } as unknown as RawSetlist;
    expect(mapSetlist(raw).team).toEqual([]);
  });
});
