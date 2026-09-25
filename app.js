(() => {
  const config = window.MENU_CONFIG || {};
  const catalogElement = document.querySelector("#catalog");
  const categoryNav = document.querySelector("#category-nav");
  const featuredSection = document.querySelector("#featured-section");
  const featuredProducts = document.querySelector("#featured-products");
  const catalogStatus = document.querySelector("#catalog-status");
  const dialog = document.querySelector("#order-dialog");
  const orderItems = document.querySelector("#order-items");
  const emptyOrder = document.querySelector("#empty-order");
  const orderFooter = document.querySelector("#order-footer");
  const floatingOrder = document.querySelector("#floating-order");
  const cart = new Map();
  let products = [];
  let toastTimer;

  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const isYes = (value) => ["sim", "yes", "true", "1", "disponivel", "disponível"].includes(String(value).trim().toLocaleLowerCase("pt-BR"));

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"' && quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        row.push(cell.trim());
        cell = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        row.push(cell.trim());
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += character;
      }
    }
    row.push(cell.trim());
    if (row.some((value) => value !== "")) rows.push(row);
    if (rows.length < 2) return [];

    const headers = rows.shift().map((header) => header.trim().toLocaleLowerCase("pt-BR"));
    return rows.map((values, rowIndex) => {
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const rawPrice = String(record.preco ?? "").replace(/\s/g, "").replace(/^R\$/i, "");
      const priceText = rawPrice.includes(",") ? rawPrice.replace(/\./g, "").replace(",", ".") : rawPrice;
      const price = Number(priceText);
      return {
        id: String(record.id || `${record.categoria}-${record.produto}-${rowIndex}`).trim(),
        category: String(record.categoria || "Outros").trim(),
        name: String(record.produto || "").trim(),
        description: String(record.descricao || "").trim(),
        price,
        photo: String(record.foto || "").trim(),
        available: isYes(record.disponivel),
        featured: isYes(record.destaque),
        order: Number(record.ordem) || rowIndex + 1
      };
    }).filter((product) => product.name && Number.isFinite(product.price) && product.price >= 0);
  }

  async function fetchProducts(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Não foi possível carregar ${url}`);
    return parseCsv(await response.text());
  }

  function productCard(product) {
    const quantity = cart.get(product.id)?.quantity || 0;
    const canAdd = product.available;
    return `<article class="product-card${canAdd ? "" : " is-unavailable"}">
      <div class="product-photo">
        ${product.photo ? `<img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}" data-placeholder="${escapeHtml(product.category)}" loading="lazy" />` : `<span class="photo-placeholder" aria-hidden="true">${escapeHtml(product.category)}</span>`}
        ${canAdd ? "" : '<span class="unavailable-label">Indisponível</span>'}
      </div>
      <div class="product-info">
        <div class="product-title-row"><h3>${escapeHtml(product.name)}</h3>${quantity ? `<span class="in-cart">${quantity} no pedido</span>` : ""}</div>
        ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : '<p class="product-description muted-description">Preparado artesanalmente.</p>'}
        <div class="product-buy"><strong>${money.format(product.price)}</strong>
          <button class="add-button" type="button" data-add="${escapeHtml(product.id)}" aria-label="Adicionar ${escapeHtml(product.name)} ao pedido" ${canAdd ? "" : "disabled"}>+</button>
        </div>
      </div>
    </article>`;
  }

  function renderCatalog() {
    const visibleProducts = products.filter((product) => product.available || config.showUnavailable !== false);
    const categories = [...new Set(visibleProducts.map((product) => product.category))];
    categoryNav.innerHTML = categories.map((category, index) => `<a class="category-link${index === 0 ? " is-current" : ""}" href="#category-${index}" data-category-link>${escapeHtml(category)}</a>`).join("");
    catalogElement.innerHTML = categories.map((category, index) => {
      const categoryProducts = visibleProducts.filter((product) => product.category === category).sort((left, right) => left.order - right.order);
      return `<section class="category-section" id="category-${index}" aria-labelledby="category-title-${index}">
        <div class="section-heading"><div><p class="eyebrow">FEITO PARA VOCÊ</p><h2 id="category-title-${index}">${escapeHtml(category)}</h2></div><span class="item-count">${categoryProducts.length} ${categoryProducts.length === 1 ? "doce" : "doces"}</span></div>
        <div class="product-grid">${categoryProducts.map(productCard).join("")}</div>
      </section>`;
    }).join("");

    const featured = visibleProducts.filter((product) => product.featured && product.available).sort((left, right) => left.order - right.order);
    featuredSection.hidden = featured.length === 0;
    featuredProducts.innerHTML = featured.map(productCard).join("");
  }

  function cartEntries() {
    return [...cart.entries()].map(([id, entry]) => ({ product: products.find((item) => item.id === id), ...entry })).filter((entry) => entry.product);
  }

  function cartTotal() {
    return cartEntries().reduce((total, entry) => total + entry.product.price * entry.quantity, 0);
  }

  function updateWhatsAppLink() {
    const lines = cartEntries().map(({ product, quantity }) => `${quantity}x ${product.name} - ${money.format(product.price)}`);
    const message = ["Olá! Gostaria de fazer um pedido:", "", ...lines, "", `Total: ${money.format(cartTotal())}`, "", "Aguardo a confirmação. Obrigado!"].join("\n");
    document.querySelector("#whatsapp-button").href = `https://wa.me/${encodeURIComponent(config.whatsappNumber || "5535991584719")}?text=${encodeURIComponent(message)}`;
  }

  function renderCart() {
    const entries = cartEntries();
    const count = entries.reduce((total, entry) => total + entry.quantity, 0);
    const total = cartTotal();
    floatingOrder.hidden = count === 0;
    document.querySelector("#floating-count").textContent = String(count);
    document.querySelector("#floating-total").textContent = money.format(total);
    document.querySelector("#order-total").textContent = money.format(total);
    emptyOrder.hidden = count !== 0;
    orderFooter.hidden = count === 0;
    orderItems.innerHTML = entries.map(({ product, quantity }) => `<article class="order-item">
      <div class="order-item-copy"><strong>${escapeHtml(product.name)}</strong><span>${money.format(product.price)} cada</span></div>
      <div class="quantity-control" aria-label="Quantidade de ${escapeHtml(product.name)}">
        <button type="button" data-change="${escapeHtml(product.id)}" data-delta="-1" aria-label="Diminuir quantidade de ${escapeHtml(product.name)}">−</button>
        <span>${quantity}</span>
        <button type="button" data-change="${escapeHtml(product.id)}" data-delta="1" aria-label="Aumentar quantidade de ${escapeHtml(product.name)}">+</button>
      </div>
      <strong class="line-total">${money.format(product.price * quantity)}</strong>
    </article>`).join("");
    updateWhatsAppLink();
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  function addToCart(id) {
    const product = products.find((item) => item.id === id);
    if (!product?.available) return;
    const existing = cart.get(id);
    cart.set(id, { quantity: (existing?.quantity || 0) + 1 });
    renderCatalog();
    renderCart();
    showToast(`${product.name} adicionado ao pedido`);
  }

  function changeQuantity(id, delta) {
    const entry = cart.get(id);
    if (!entry) return;
    const nextQuantity = entry.quantity + delta;
    if (nextQuantity <= 0) cart.delete(id);
    else cart.set(id, { quantity: nextQuantity });
    renderCatalog();
    renderCart();
  }

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    if (addButton) addToCart(addButton.dataset.add);
    const quantityButton = event.target.closest("[data-change]");
    if (quantityButton) changeQuantity(quantityButton.dataset.change, Number(quantityButton.dataset.delta));
    const categoryLink = event.target.closest("[data-category-link]");
    if (categoryLink) {
      document.querySelectorAll("[data-category-link]").forEach((link) => link.classList.toggle("is-current", link === categoryLink));
    }
  });
  document.addEventListener("error", (event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.matches(".product-photo img")) {
      const placeholder = document.createElement("span");
      placeholder.className = "photo-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = image.dataset.placeholder || "Doce artesanal";
      image.replaceWith(placeholder);
    }
  }, true);

  floatingOrder.addEventListener("click", () => dialog.showModal());
  document.querySelector("#close-order").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.querySelector("#whatsapp-button").addEventListener("click", (event) => {
    if (cart.size === 0) event.preventDefault();
  });

  async function init() {
    try {
      if (config.sheetCsvUrl) {
        try {
          products = await fetchProducts(config.sheetCsvUrl);
        } catch (error) {
          products = await fetchProducts("/catalog.csv");
          catalogStatus.textContent = "Não foi possível atualizar a planilha agora. Exibindo o cardápio de referência.";
          console.warn(error);
        }
      } else {
        products = await fetchProducts("/catalog.csv");
      }
      if (products.length === 0) throw new Error("Nenhum produto válido encontrado no catálogo.");
      renderCatalog();
      renderCart();
    } catch (error) {
      catalogStatus.textContent = "Não foi possível carregar o cardápio. Tente novamente mais tarde.";
      console.error(error);
    }
  }

  init();
})();