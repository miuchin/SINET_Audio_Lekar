/*
  ====== SINET CATALOG UI ======
  File: js/catalog/catalog-ui.js
  Version: 1.1
  Author: miuchins | Co-author: SINET AI
*/

import { loadCatalog } from "./catalog-loader.js";

const listEl = document.getElementById("catalog-list");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function renderList(items, meta) {
  if (!items || !Array.isArray(items)) {
    listEl.innerHTML = "<p>❌ Katalog nije učitan.</p>";
    return;
  }

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "10px";
  header.innerHTML = `
    <div style="font-weight:bold;">SINET Catalog</div>
    <div style="color:#777; font-size:0.9rem;">
      ${meta?.version ? `v${esc(meta.version)}` : ""} ${meta?.date ? `• ${esc(meta.date)}` : ""}
      • Items: ${items.length}
    </div>
  `;

  const table = document.createElement("table");
  table.className = "sinet-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>UID</th><th>Simptom</th><th>Oblast</th><th>MKB-10</th><th>Senior</th><th>Akcije</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${esc(item.uid)}</td>
          <td>${esc(item.simptom)}</td>
          <td>${esc(item.oblast)}</td>
          <td>${esc(item.mkb10 || "")}</td>
          <td>${item.seniorQuick ? "⭐" : ""}</td>
          <td class="actions"><button class="edit" data-uid="${esc(item.uid)}">✏️</button></td>
        </tr>
      `).join("")}
    </tbody>
  `;

  listEl.innerHTML = "";
  listEl.appendChild(header);
  listEl.appendChild(table);

  table.querySelectorAll(".edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.uid;
      window.location.href = `catalog-editor.html?uid=${encodeURIComponent(uid)}`;
    });
  });
}

(async () => {
  const catalog = await loadCatalog();
  renderList(catalog.items, catalog.meta);
})();
