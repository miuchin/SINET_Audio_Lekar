/*
  ================================
  SINET – Catalog List Controller
  File: js/catalog-list.js
  Version: 1.1
  Author: miuchins | Co-author: SINET AI
  Notes: No localStorage. Editor is opened via ?uid=
  ================================
*/

import { loadCatalog } from "./catalog/catalog-loader.js";

const tableBody = document.getElementById("catalog-table-body");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function renderCatalog(items) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  (items || []).forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${esc(item.uid)}</td>
      <td>${esc(item.simptom)}</td>
      <td>${esc(item.oblast)}</td>
      <td>${item.seniorQuick ? "⭐" : ""}</td>
      <td class="actions">
        <button class="btn edit" data-uid="${esc(item.uid)}">✏️</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  tableBody.querySelectorAll(".edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.uid;
      window.location.href = `catalog-editor.html?uid=${encodeURIComponent(uid)}`;
    });
  });
}

(async function init() {
  const catalog = await loadCatalog();
  renderCatalog(catalog.items);
})();
