// Unit tests pentru helper-ul isFrostAlertStale din public/app.js
// Replicat aici pentru test Node (app.js are dependente browser)

import { describe, it, expect } from "vitest";

// Helper replicat din public/app.js
function todayLocal() {
  var d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function isFrostAlertStale(frost) {
  if (!frost || !frost.active) return true;
  if (!frost.date) return false; // fara data → tratam ca relevant (backward compat)
  return frost.date < todayLocal();
}

// Helper pentru a genera data de ieri/maine
function shiftDate(days) {
  var d = new Date();
  d.setDate(d.getDate() + days);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

describe("isFrostAlertStale", () => {
  it("returneaza true daca frost e null/undefined", () => {
    expect(isFrostAlertStale(null)).toBe(true);
    expect(isFrostAlertStale(undefined)).toBe(true);
  });

  it("returneaza true daca frost.active e false", () => {
    expect(isFrostAlertStale({ active: false })).toBe(true);
    expect(isFrostAlertStale({ active: false, date: "2026-04-11" })).toBe(true);
  });

  it("returneaza false daca frost fara data (backward compat)", () => {
    // Alerte vechi fara camp date sa ramana vizibile
    expect(isFrostAlertStale({ active: true })).toBe(false);
  });

  it("returneaza false daca data alertei e azi", () => {
    expect(isFrostAlertStale({ active: true, date: todayLocal() })).toBe(false);
  });

  it("returneaza false daca data alertei e maine", () => {
    expect(isFrostAlertStale({ active: true, date: shiftDate(1) })).toBe(false);
  });

  it("returneaza false daca data alertei e peste 3 zile", () => {
    expect(isFrostAlertStale({ active: true, date: shiftDate(3) })).toBe(false);
  });

  it("returneaza true daca data alertei e ieri (bug-ul din poza)", () => {
    expect(isFrostAlertStale({ active: true, date: shiftDate(-1) })).toBe(true);
  });

  it("returneaza true daca data alertei e acum o saptamana", () => {
    expect(isFrostAlertStale({ active: true, date: shiftDate(-7) })).toBe(true);
  });

  it("exemplu concret: data 2026-04-10 cand azi e 2026-04-11", () => {
    // Simuleaza scenariul exact din poza lui Roland
    // todayLocal() va returna data curenta reala — testul confirma comparatia string
    const past = "2026-04-10";
    const today = todayLocal();
    // Cand today >= 2026-04-11, alerta pentru 2026-04-10 trebuie filtrata
    if (today >= "2026-04-11") {
      expect(isFrostAlertStale({ active: true, date: past })).toBe(true);
    }
  });
});
