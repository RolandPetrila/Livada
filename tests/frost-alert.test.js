// Unit tests pentru isAlertStale (fost isFrostAlertStale) din public/app.js
// Replicat aici pentru test Node (app.js are dependente browser)

import { describe, it, expect, vi, afterEach } from "vitest";

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

// F8.2: isAlertStale cu suport frostHour/alertHour + 2h buffer
function isAlertStale(alert) {
  if (!alert || !alert.active) return true;
  if (!alert.date) return false; // backward compat
  var alertTime = alert.frostHour || alert.alertHour;
  if (alertTime) {
    var alertMs = new Date(alertTime).getTime();
    if (!isNaN(alertMs)) {
      return Date.now() > alertMs + 2 * 60 * 60 * 1000;
    }
  }
  return alert.date < todayLocal();
}

// Alias backward compat
var isFrostAlertStale = isAlertStale;

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

describe("isAlertStale (backward compat — date-only)", () => {
  it("returneaza true daca frost e null/undefined", () => {
    expect(isAlertStale(null)).toBe(true);
    expect(isAlertStale(undefined)).toBe(true);
  });

  it("returneaza true daca frost.active e false", () => {
    expect(isAlertStale({ active: false })).toBe(true);
    expect(isAlertStale({ active: false, date: "2026-04-11" })).toBe(true);
  });

  it("returneaza false daca frost fara data (backward compat)", () => {
    expect(isAlertStale({ active: true })).toBe(false);
  });

  it("returneaza false daca data alertei e azi", () => {
    expect(isAlertStale({ active: true, date: todayLocal() })).toBe(false);
  });

  it("returneaza false daca data alertei e maine", () => {
    expect(isAlertStale({ active: true, date: shiftDate(1) })).toBe(false);
  });

  it("returneaza false daca data alertei e peste 3 zile", () => {
    expect(isAlertStale({ active: true, date: shiftDate(3) })).toBe(false);
  });

  it("returneaza true daca data alertei e ieri", () => {
    expect(isAlertStale({ active: true, date: shiftDate(-1) })).toBe(true);
  });

  it("returneaza true daca data alertei e acum o saptamana", () => {
    expect(isAlertStale({ active: true, date: shiftDate(-7) })).toBe(true);
  });
});

describe("isAlertStale (Varianta A — frostHour cu 2h buffer)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returneaza false daca frostHour e peste 3 ore", () => {
    var futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    var isoStr =
      futureTime.getFullYear() +
      "-" +
      String(futureTime.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(futureTime.getDate()).padStart(2, "0") +
      "T" +
      String(futureTime.getHours()).padStart(2, "0") +
      ":00";
    expect(
      isAlertStale({
        active: true,
        date: todayLocal(),
        frostHour: isoStr,
      }),
    ).toBe(false);
  });

  it("returneaza false daca frostHour e acum 1 ora (in buffer 2h)", () => {
    var pastTime = new Date(Date.now() - 1 * 60 * 60 * 1000);
    var isoStr =
      pastTime.getFullYear() +
      "-" +
      String(pastTime.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(pastTime.getDate()).padStart(2, "0") +
      "T" +
      String(pastTime.getHours()).padStart(2, "0") +
      ":00";
    expect(
      isAlertStale({
        active: true,
        date: todayLocal(),
        frostHour: isoStr,
      }),
    ).toBe(false);
  });

  it("returneaza true daca frostHour e acum 3 ore (depasit buffer 2h)", () => {
    var pastTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
    var isoStr =
      pastTime.getFullYear() +
      "-" +
      String(pastTime.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(pastTime.getDate()).padStart(2, "0") +
      "T" +
      String(pastTime.getHours()).padStart(2, "0") +
      ":00";
    expect(
      isAlertStale({
        active: true,
        date: todayLocal(),
        frostHour: isoStr,
      }),
    ).toBe(true);
  });

  it("functioneaza cu alertHour (pentru alerte vant/etc)", () => {
    var futureTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
    var isoStr =
      futureTime.getFullYear() +
      "-" +
      String(futureTime.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(futureTime.getDate()).padStart(2, "0") +
      "T" +
      String(futureTime.getHours()).padStart(2, "0") +
      ":00";
    expect(
      isAlertStale({
        active: true,
        date: todayLocal(),
        alertHour: isoStr,
      }),
    ).toBe(false);
  });

  it("fallback pe date daca frostHour e invalid", () => {
    expect(
      isAlertStale({
        active: true,
        date: todayLocal(),
        frostHour: "invalid-time",
      }),
    ).toBe(false); // date = azi → nu e stale
  });
});

describe("isFrostAlertStale alias", () => {
  it("isFrostAlertStale este acelasi cu isAlertStale", () => {
    expect(isFrostAlertStale).toBe(isAlertStale);
  });
});
