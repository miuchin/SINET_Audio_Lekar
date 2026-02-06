// ================================
// SINET – Catalog List Controller
// ================================

import { loadCatalog } from "./catalog/catalog-loader.js";

const tableBody = document.getElementById("catalog-table-body");

function renderCatalog(catalog) {
  tableBody.innerHTML = "";

  catalog.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.uid}</td>
      <td>${item.simptom}</td>
      <td>${item.oblast}</td>
      <td>${item.seniorQuick ? "⭐" : ""}</td>
      <td class="actions">
        <button class="btn play" onclick="playItem(${item.uid})">▶</button>
        <button class="btn pause" onclick="pauseAudio()">⏸</button>
        <button class="btn stop" onclick="stopAudio()">⏹</button>
        <button class="btn edit" onclick="openEditor(${item.uid})">✏️</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

// ================================
// NAVIGACIJA → EDITOR
// ================================

window.openEditor = function (uid) {
  localStorage.setItem("SINET_CURRENT_UID", String(uid));
  window.location.href = "catalog-editor.html";
};

// ================================
// AUDIO PLACEHOLDERS
// ================================

window.playItem = function (uid) {
  console.log("PLAY UID", uid);
};

window.pauseAudio = function () {
  console.log("PAUSE");
};

window.stopAudio = function () {
  console.log("STOP");
};

// ================================
// INIT
// ================================

(async function init() {
  const catalog = await loadCatalog();
  renderCatalog(catalog);
})();

