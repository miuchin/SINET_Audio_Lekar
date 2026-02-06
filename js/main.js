// js/main.js

import { loadCatalog } from "./catalog/catalog-loader.js";
import { play, pause, resume, stop } from "./ui/bindings.js";

/* =========================================
   JAVNI API — POSTOJI, ALI SE MOŽE BLOKIRATI
========================================= */

window.SINET = {
  play,
  pause,
  resume,
  stop
};

/* =========================================
   LOGIKA ZA index.html (AKO POSTOJI #app)
========================================= */

const app = document.getElementById("app");

if (app) {
  initIndex();
}

async function initIndex() {
  try {
    const catalog = await loadCatalog(); // ⬅ VALIDACIJA SE DEŠAVA OVDE

    renderSeniorQuick(catalog);
  } catch (err) {
    console.error(err);

    // ❌ BLOKADA CELOG SISTEMA
    app.innerHTML = `
      <h2>❌ Katalog nije validan</h2>
      <pre>${err.message}</pre>
      <p>Aplikacija je zaustavljena radi bezbednosti.</p>
    `;

    // dodatna sigurnost
    window.SINET.play = () => {};
    window.SINET.pause = () => {};
    window.SINET.resume = () => {};
    window.SINET.stop = () => {};
  }
}

function renderSeniorQuick(catalog) {
  const quickItems = catalog.items.filter(
    i => i.status === "active" && i.seniorQuick === true
  );

  if (quickItems.length === 0) {
    app.innerHTML = "<p>Nema Senior Quick stavki.</p>";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid";

  quickItems.forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = item.simptom;
    btn.onclick = () => window.SINET.play();
    grid.appendChild(btn);
  });

  app.innerHTML = "";
  app.appendChild(grid);
}

