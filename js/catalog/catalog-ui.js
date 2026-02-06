// js/catalog/catalog-ui.js
import { loadCatalog } from "./catalog-loader.js";

const listEl = document.getElementById("catalog-list");

if (!listEl) {
  throw new Error("catalog-list element ne postoji u HTML-u");
}

function renderList(catalog) {
  if (!catalog || !Array.isArray(catalog.items)) {
    listEl.innerHTML = "<p>❌ Katalog nije učitan.</p>";
    return;
  }

  const table = document.createElement("table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>UID</th>
        <th>Simptom</th>
        <th>Oblast</th>
        <th>Senior</th>
        <th>Akcije</th>
      </tr>
    </thead>
    <tbody>
      ${catalog.items.map(item => `
        <tr>
          <td>${item.uid}</td>
          <td>${item.simptom}</td>
          <td>${item.oblast}</td>
          <td>${item.seniorQuick ? "⭐" : ""}</td>
          <td class="actions">
            <button class="edit" data-uid="${item.uid}">✏️</button>
          </td>
        </tr>
      `).join("")}
    </tbody>
  `;

  listEl.innerHTML = "";
  listEl.appendChild(table);

  // 👉 VEZA KA EDITORU
  table.querySelectorAll(".edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.dataset.uid;
      window.location.href = `catalog-editor.html?uid=${uid}`;
    });
  });
}

(async () => {
  const catalog = await loadCatalog();
  renderList(catalog);
})();

