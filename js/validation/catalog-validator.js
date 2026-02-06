// js/validation/catalog-validator.js

/**
 * SINET Catalog Validation Engine
 * -------------------------------
 * Pravilo: ili je katalog VALIDAN ili se ODBIJA.
 * Nema auto-fix, nema warn-only.
 */

export function validateCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.items)) {
    throwError("Katalog nema validnu strukturu (items[])");
  }

  const uidSet = new Set();
  const idSet = new Set();

  catalog.items.forEach((item, index) => {
    validateItem(item, index, uidSet, idSet);
  });

  return true; // ako je stigao dovde → validan
}

/* ===================================================== */

function validateItem(item, index, uidSet, idSet) {
  const ctx = `Stavka #${index}`;

  // ---------- UID ----------
  if (typeof item.uid !== "number" || item.uid <= 0) {
    throwError(`${ctx}: uid mora biti pozitivan broj`);
  }
  if (uidSet.has(item.uid)) {
    throwError(`${ctx}: dupliran uid (${item.uid})`);
  }
  uidSet.add(item.uid);

  // ---------- ID (slug) ----------
  if (typeof item.id !== "string" || !/^[a-z0-9-]+$/.test(item.id)) {
    throwError(`${ctx}: id mora biti slug (a-z0-9-)`);
  }
  if (idSet.has(item.id)) {
    throwError(`${ctx}: dupliran id (${item.id})`);
  }
  idSet.add(item.id);

  // ---------- STATUS ----------
  assertEnum(item.status, ["active", "disabled", "archived"], ctx, "status");

  // ---------- OBAVEZNA POLJA ----------
  assertString(item.oblast, ctx, "oblast");
  assertString(item.simptom, ctx, "simptom");
  assertString(item.opis, ctx, "opis");

  // ---------- ZABRANJENE TVRDNJE ----------
  assertNoMedicalClaims(item.opis, ctx);

  // ---------- FREKVENCIJE ----------
  if (!Array.isArray(item.frekvencije) || item.frekvencije.length === 0) {
    throwError(`${ctx}: mora postojati bar jedna frekvencija`);
  }

  const enabledFreqs = item.frekvencije.filter(f => f.enabled === true);
  if (enabledFreqs.length === 0) {
    throwError(`${ctx}: nema enabled frekvencija`);
  }

  enabledFreqs.forEach((f, i) => {
    validateFrequency(f, item, `${ctx} → frekvencija #${i}`);
  });

  // ---------- TRAJANJE ----------
  if (
    typeof item.trajanjePoFrekvencijiMin !== "number" ||
    item.trajanjePoFrekvencijiMin < 1 ||
    item.trajanjePoFrekvencijiMin > 60
  ) {
    throwError(`${ctx}: trajanjePoFrekvencijiMin mora biti 1–60`);
  }

  const expectedTotal =
    enabledFreqs.length * item.trajanjePoFrekvencijiMin;

  if (item.ukupnoTrajanjeMin !== expectedTotal) {
    throwError(
      `${ctx}: ukupnoTrajanjeMin mora biti ${expectedTotal}, a ne ${item.ukupnoTrajanjeMin}`
    );
  }

  // ---------- AUDIO ----------
  assertEnum(
    item.subAudio,
    ["mono", "binaural", "pulsni", "mix"],
    ctx,
    "subAudio"
  );

  // ---------- FLAGS ----------
  assertBoolean(item.seniorQuick, ctx, "seniorQuick");
  assertBoolean(item.favoritesDefault, ctx, "favoritesDefault");

  // ---------- BEZBEDNOST ----------
  assertString(item.bezbednost, ctx, "bezbednost");

  // ---------- IZVORI ----------
  if (!Array.isArray(item.izvori) || item.izvori.length === 0) {
    throwError(`${ctx}: mora postojati bar jedan izvor`);
  }

  // ---------- TAGS ----------
  if (!Array.isArray(item.tags)) {
    throwError(`${ctx}: tags mora biti niz`);
  }

  // ---------- REVIEW ----------
  if (!isISODate(item.lastReviewed)) {
    throwError(`${ctx}: lastReviewed mora biti YYYY-MM-DD`);
  }
}

/* ===================================================== */

function validateFrequency(freq, item, ctx) {
  if (typeof freq.value !== "number" || freq.value <= 0 || freq.value > 20000) {
    throwError(`${ctx}: value mora biti 1–20000 Hz`);
  }

  assertString(freq.svrha, ctx, "svrha");
  if (freq.svrha.length < 5) {
    throwError(`${ctx}: svrha mora imati min 5 karaktera`);
  }

  if (!item.izvori.includes(freq.izvor)) {
    throwError(`${ctx}: izvor frekvencije mora postojati u item.izvori[]`);
  }

  if (typeof freq.enabled !== "boolean") {
    throwError(`${ctx}: enabled mora biti boolean`);
  }
}

/* ===================================================== */
/* HELPERS */

function assertString(val, ctx, field) {
  if (typeof val !== "string" || val.trim() === "") {
    throwError(`${ctx}: ${field} mora biti non-empty string`);
  }
}

function assertBoolean(val, ctx, field) {
  if (typeof val !== "boolean") {
    throwError(`${ctx}: ${field} mora biti boolean`);
  }
}

function assertEnum(val, list, ctx, field) {
  if (!list.includes(val)) {
    throwError(`${ctx}: ${field} mora biti jedno od: ${list.join(", ")}`);
  }
}

function assertNoMedicalClaims(text, ctx) {
  const forbidden = [
    "leči",
    "izlečenje",
    "terapija",
    "dijagnoza",
    "garantuje"
  ];
  forbidden.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      throwError(`${ctx}: opis sadrži zabranjenu reč (${word})`);
    }
  });
}

function isISODate(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function throwError(msg) {
  console.error("❌ VALIDATION FAILED:", msg);
  throw new Error(msg);
}

