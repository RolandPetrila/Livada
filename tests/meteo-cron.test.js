// Unit tests for api/meteo-cron.js — Open-Meteo pipeline + multi-alert + Redis
// Mocks: @upstash/redis, global fetch, process.env

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockKv, mockFromEnv } = vi.hoisted(() => {
  const mockKv = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };
  return { mockKv, mockFromEnv: vi.fn(() => mockKv) };
});

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

import handler from "../api/meteo-cron.js";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fakeReq(authHeader = "") {
  return {
    method: "GET",
    headers: {
      get: (name) => {
        if (name.toLowerCase() === "authorization") return authHeader;
        return null;
      },
    },
  };
}

// Generate hourly times starting from now
function hourlyTimes(count = 120) {
  const times = [];
  const base = new Date();
  base.setMinutes(0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * 3600_000);
    times.push(d.toISOString().slice(0, 16));
  }
  return times;
}

// Generate daily dates starting from today (Europe/Bucharest — match production)
// Foloseste aceeasi formatare ca meteo-cron.js pentru a evita flakiness
// intre 22:00 si 24:00 UTC cand UTC.day != Romania.day.
function dailyDates(count = 5) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dates = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * 24 * 3600 * 1000);
    dates.push(fmt.format(d));
  }
  return dates;
}

function makeOpenMeteoResponse(overrides = {}) {
  const times = hourlyTimes(120);
  const daily = dailyDates(5);
  return {
    current: {
      temperature_2m: 15,
      relative_humidity_2m: 60,
      weather_code: 3,
      wind_speed_10m: 12,
      precipitation: 0,
      ...overrides.current,
    },
    hourly: {
      time: times,
      temperature_2m: Array(120).fill(15),
      apparent_temperature: Array(120).fill(13),
      precipitation: Array(120).fill(0),
      precipitation_probability: Array(120).fill(10),
      relative_humidity_2m: Array(120).fill(60),
      weather_code: Array(120).fill(3),
      uv_index: Array(120).fill(4),
      soil_moisture_0_to_1cm: Array(120).fill(0.2),
      cloud_cover: Array(120).fill(50),
      dew_point_2m: Array(120).fill(5),
      wind_gusts_10m: Array(120).fill(15),
      ...overrides.hourly,
    },
    daily: {
      time: daily,
      temperature_2m_max: [18, 17, 16, 19, 20],
      temperature_2m_min: [8, 7, 6, 9, 10],
      apparent_temperature_min: [6, 5, 4, 7, 8],
      precipitation_sum: [0, 2, 0, 0, 1],
      weather_code: [3, 61, 3, 1, 2],
      uv_index_max: [5, 3, 6, 5, 4],
      et0_fao_evapotranspiration: [3, 2.5, 3.5, 3, 2],
      wind_gusts_10m_max: [25, 20, 30, 22, 18],
      ...overrides.daily,
    },
  };
}

function mockFetchOk(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

function mockFetchErr(status = 500) {
  return Promise.resolve({
    ok: false,
    status,
  });
}

describe("meteo-cron API route", () => {
  const ORIG_SECRET = process.env.CRON_SECRET;
  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue(null);
    mockKv.set.mockResolvedValue("OK");
    mockKv.del.mockResolvedValue("OK");

    // Default fetch mock: Open-Meteo OK, Yr.no/multi-model fail
    fetchSpy = vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (
          url.includes("open-meteo.com/v1/forecast") &&
          !url.includes("models=")
        )
          return mockFetchOk(makeOpenMeteoResponse());
        if (url.includes("met.no"))
          return Promise.reject(new Error("yr.no skip"));
        if (url.includes("models="))
          return Promise.reject(new Error("multi-model skip"));
        return mockFetchErr(404);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIG_SECRET) process.env.CRON_SECRET = ORIG_SECRET;
    else delete process.env.CRON_SECRET;
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await handler(fakeReq());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/CRON_SECRET/);
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = await handler(fakeReq(""));
    expect(res.status).toBe(401);
  });

  it("returns 401 when authorization header is wrong", async () => {
    const res = await handler(fakeReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("accepts correct Bearer token", async () => {
    const res = await handler(fakeReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
  });

  // ── Redis init failure ────────────────────────────────────────────────────
  it("returns 503 when Redis.fromEnv fails", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("Redis not configured");
    });
    const res = await handler(fakeReq("Bearer test-cron-secret"));
    expect(res.status).toBe(503);
  });

  // ── Happy path ────────────────────────────────────────────────────────────
  it("saves meteo data to Redis and returns success", async () => {
    const res = await handler(fakeReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.temp).toBe(15);
    // Verify Redis writes
    expect(mockKv.set).toHaveBeenCalled();
    const setKeys = mockKv.set.mock.calls.map((c) => c[0]);
    expect(setKeys).toContain("livada:meteo:history");
    expect(setKeys).toContain("livada:frost-alert");
    expect(setKeys).toContain("livada:disease-risk");
    expect(setKeys).toContain("livada:cron:last-run");
  });

  it("prunes history to 90 days max", async () => {
    // Existing history with 95 days
    const oldHistory = {};
    for (let i = 0; i < 95; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i - 1);
      oldHistory[d.toISOString().slice(0, 10)] = { temp: 10 };
    }
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:meteo:history") return Promise.resolve(oldHistory);
      return Promise.resolve(null);
    });

    await handler(fakeReq("Bearer test-cron-secret"));
    // Find the history set call
    const histCall = mockKv.set.mock.calls.find(
      (c) => c[0] === "livada:meteo:history",
    );
    const savedHistory = histCall[1];
    expect(Object.keys(savedHistory).length).toBeLessThanOrEqual(91); // 90 old + today
  });

  // ── Frost alert ───────────────────────────────────────────────────────────
  it("generates frost alert when apparent temp < 3.5°C (FROST_THRESHOLD)", async () => {
    const month = new Date().getMonth() + 1;
    if (month < 3 || month > 5) return; // frost only checked Mar-May

    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        return mockFetchOk(
          makeOpenMeteoResponse({
            hourly: {
              time: hourlyTimes(120),
              temperature_2m: Array(120).fill(1),
              apparent_temperature: Array(120).fill(0.5), // below 3.5
              precipitation: Array(120).fill(0),
              precipitation_probability: Array(120).fill(0),
              relative_humidity_2m: Array(120).fill(80),
              weather_code: Array(120).fill(0),
              uv_index: Array(120).fill(1),
              soil_moisture_0_to_1cm: Array(120).fill(0.15),
              cloud_cover: Array(120).fill(10), // clear sky
              dew_point_2m: Array(120).fill(-2), // below 0
              wind_gusts_10m: Array(120).fill(5),
            },
            daily: {
              time: dailyDates(5),
              temperature_2m_max: [5, 4, 3, 6, 7],
              temperature_2m_min: [0, -1, -2, 1, 2],
              apparent_temperature_min: [0, -1, -2, 1, 2],
              precipitation_sum: [0, 0, 0, 0, 0],
              weather_code: [0, 0, 0, 1, 2],
              uv_index_max: [2, 2, 2, 3, 3],
              et0_fao_evapotranspiration: [1, 1, 1, 2, 2],
              wind_gusts_10m_max: [10, 10, 10, 15, 15],
            },
          }),
        );
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.frostAlert).toBe(true);
  });

  it("does not generate frost alert when temps are warm", async () => {
    const month = new Date().getMonth() + 1;
    if (month < 3 || month > 5) return;

    // Default response has temps at 15°C — well above threshold
    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.frostAlert).toBe(false);
  });

  // ── Hail alert ────────────────────────────────────────────────────────────
  it("generates hail alert on WMO code 96 or 99", async () => {
    const weatherCodes = Array(120).fill(3);
    weatherCodes[24] = 96; // hail in 24h

    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        return mockFetchOk(
          makeOpenMeteoResponse({
            hourly: {
              time: hourlyTimes(120),
              temperature_2m: Array(120).fill(20),
              apparent_temperature: Array(120).fill(18),
              precipitation: Array(120).fill(0),
              precipitation_probability: Array(120).fill(0),
              relative_humidity_2m: Array(120).fill(50),
              weather_code: weatherCodes,
              uv_index: Array(120).fill(4),
              soil_moisture_0_to_1cm: Array(120).fill(0.2),
              cloud_cover: Array(120).fill(80),
              dew_point_2m: Array(120).fill(10),
              wind_gusts_10m: Array(120).fill(20),
            },
          }),
        );
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.hailAlert).toBe(true);
  });

  // ── Wind alert ────────────────────────────────────────────────────────────
  it("generates wind alert when gusts >= 40 km/h", async () => {
    const gusts = Array(120).fill(10);
    gusts[12] = 55; // strong gust

    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        return mockFetchOk(
          makeOpenMeteoResponse({
            hourly: {
              time: hourlyTimes(120),
              temperature_2m: Array(120).fill(20),
              apparent_temperature: Array(120).fill(18),
              precipitation: Array(120).fill(0),
              precipitation_probability: Array(120).fill(0),
              relative_humidity_2m: Array(120).fill(50),
              weather_code: Array(120).fill(3),
              uv_index: Array(120).fill(4),
              soil_moisture_0_to_1cm: Array(120).fill(0.2),
              cloud_cover: Array(120).fill(50),
              dew_point_2m: Array(120).fill(10),
              wind_gusts_10m: gusts,
            },
          }),
        );
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.windAlert).toBe(true);
  });

  // ── Heat alert ────────────────────────────────────────────────────────────
  it("generates heat alert when daily max >= 35°C", async () => {
    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        return mockFetchOk(
          makeOpenMeteoResponse({
            daily: {
              time: dailyDates(5),
              temperature_2m_max: [36, 37, 33, 30, 28],
              temperature_2m_min: [22, 23, 20, 18, 16],
              apparent_temperature_min: [20, 21, 18, 16, 14],
              precipitation_sum: [0, 0, 0, 0, 0],
              weather_code: [1, 1, 2, 2, 3],
              uv_index_max: [8, 9, 7, 6, 5],
              et0_fao_evapotranspiration: [6, 7, 5, 4, 3],
              wind_gusts_10m_max: [20, 25, 15, 12, 10],
            },
          }),
        );
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.heatAlert).toBe(true);
  });

  // ── Rain alert ────────────────────────────────────────────────────────────
  it("generates rain alert when daily precip >= 20mm", async () => {
    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        return mockFetchOk(
          makeOpenMeteoResponse({
            daily: {
              time: dailyDates(5),
              temperature_2m_max: [18, 17, 16, 19, 20],
              temperature_2m_min: [8, 7, 6, 9, 10],
              apparent_temperature_min: [6, 5, 4, 7, 8],
              precipitation_sum: [25, 2, 0, 0, 1],
              weather_code: [65, 61, 3, 1, 2],
              uv_index_max: [2, 3, 5, 5, 4],
              et0_fao_evapotranspiration: [2, 2.5, 3.5, 3, 2],
              wind_gusts_10m_max: [25, 20, 15, 12, 10],
            },
          }),
        );
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.rainAlert).toBe(true);
  });

  // ── Disease risk ──────────────────────────────────────────────────────────
  it("generates disease risk when rainy+warm+humid", async () => {
    // Conditions: 4+ hours rainy (precip > 0 AND prob > 50), avgT 10-25, avgH > 70
    const precip = Array(120).fill(0);
    const precipProb = Array(120).fill(0);
    for (let i = 0; i < 10; i++) {
      precip[i] = 2;
      precipProb[i] = 80;
    }

    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        return mockFetchOk(
          makeOpenMeteoResponse({
            hourly: {
              time: hourlyTimes(120),
              temperature_2m: Array(120).fill(18),
              apparent_temperature: Array(120).fill(16),
              precipitation: precip,
              precipitation_probability: precipProb,
              relative_humidity_2m: Array(120).fill(85),
              weather_code: Array(120).fill(61),
              uv_index: Array(120).fill(2),
              soil_moisture_0_to_1cm: Array(120).fill(0.3),
              cloud_cover: Array(120).fill(90),
              dew_point_2m: Array(120).fill(14),
              wind_gusts_10m: Array(120).fill(10),
            },
          }),
        );
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    const body = await res.json();
    expect(body.diseaseRisk).toBe(true);
  });

  // ── Open-Meteo retry ──────────────────────────────────────────────────────
  it("retries Open-Meteo on first failure", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn((url) => {
      if (
        url.includes("open-meteo.com/v1/forecast") &&
        !url.includes("models=")
      ) {
        callCount++;
        if (callCount === 1) return mockFetchErr(503);
        return mockFetchOk(makeOpenMeteoResponse());
      }
      return Promise.reject(new Error("skip"));
    });

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(callCount).toBe(2);
  });

  it("returns 500 when Open-Meteo fails on all retries", async () => {
    globalThis.fetch = vi.fn(() => mockFetchErr(503));

    const res = await handler(fakeReq("Bearer test-cron-secret"));
    expect(res.status).toBe(500);
    // Verify error is logged to Redis
    const lastRunCall = mockKv.set.mock.calls.find(
      (c) => c[0] === "livada:cron:last-run",
    );
    expect(lastRunCall).toBeDefined();
    expect(lastRunCall[1].success).toBe(false);
  });

  // ── Alert journal dedup ───────────────────────────────────────────────────
  it("deduplicates alert journal entries by type+date", async () => {
    const existingJournal = [
      {
        key: "frost:2026-04-13",
        type: "frost",
        label: "Inghet",
        date: "2026-04-13",
        loggedAt: "2026-04-13T00:00:00.000Z",
      },
    ];
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:alert-journal")
        return Promise.resolve(existingJournal);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });

    await handler(fakeReq("Bearer test-cron-secret"));
    // Journal should not have duplicate entries
    const journalCall = mockKv.set.mock.calls.find(
      (c) => c[0] === "livada:alert-journal",
    );
    if (journalCall) {
      const saved = journalCall[1];
      const keys = saved.map((e) => e.key);
      const unique = new Set(keys);
      expect(keys.length).toBe(unique.size);
    }
  });
});
