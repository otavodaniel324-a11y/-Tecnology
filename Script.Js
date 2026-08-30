/* =============================================
   TECNOLOGY S.A.S — Script.Js  (versión completa)
   ============================================= */

// ──────────────────────────────────────────────
// BASE DE DATOS DE PRODUCTOS
// ──────────────────────────────────────────────
const todosLosProductos = [
  { id:1,  nombre:"Teclado Gamer Membrana",    descripcion:"Redragon Shiva White K512 Rgb Español", precio:149000,   imagen:"Imagenes/Login 1.png" },
  { id:2,  nombre:"Nintendo Switch",           descripcion:"Oled 64gb Color Blanco/negro",          precio:1399900,  imagen:"Imagenes/Logi 2.png"  },
  { id:3,  nombre:"Mouse Jiexin",              descripcion:"Vertical Ergonómico Inalámbrico",        precio:24000,    imagen:"Imagenes/logi 3.png"  },
  { id:4,  nombre:"Pc Gamer Rgb",              descripcion:"Ryzen 7 5700g + 32gb + Ssd 512gb",      precio:3256542,  imagen:"Imagenes/logi 4.png"  },
  { id:5,  nombre:"Cargador Doble PS5",        descripcion:"Mandos Dualsense · LED · USB",          precio:64158,    imagen:"Imagenes/logi 5.png"  },
  { id:6,  nombre:"Hp Omen 27",               descripcion:"FHD 1920×1080 · 180hz · 1ms",          precio:769900,   imagen:"Imagenes/Logi 6.png"  },
  { id:7,  nombre:"Silla Gamer Ergonomica",           descripcion:"Maxplaygt Sy-gc031, Neg Vlbra",  precio:479900,   imagen:"Imagenes/Silla Gamer.png"  },
  { id:8,  nombre:"Sony WH-1000XM5",          descripcion:"Cancelación activa · 30h batería",      precio:1250000,  imagen:"Imagenes/DIADEMA.png" },
  { id:9,  nombre:"Webcam Logitech 4K",        descripcion:"StreamCam Pro · Autofoco IA",           precio:420000,   imagen:"Imagenes/logi 3.png"  },
  { id:10, nombre:"SSD NVMe 1TB",             descripcion:"Samsung 980 Pro · 7000MB/s",            precio:310000,   imagen:"Imagenes/logi 5.png"  },
  { id:11, nombre:"Mousepad XXL RGB",          descripcion:"90×40cm · Bordes cosidos",              precio:85000,    imagen:"Imagenes/Teclado.png" },
  { id:12, nombre:"Control Xbox Elite S2",     descripcion:"Inalámbrico · Gatillos ajustables",     precio:680000,   imagen:"Imagenes/Play 5.png"  },
  { id:13, nombre:"Reloj Hombre",     descripcion:"Inalámbrico · Gatillos ajustables",     precio:508750,   imagen:"Imagenes/Reloj Tactil.png"  },
  { id:14, nombre:"Teclado Logitech G Serie G",     descripcion:"QWERTY Romer-G inglés internacional color negro con luz RGB",     precio:193954,   imagen:"Imagenes/Teclado gamer.png"  },
  { id:15, nombre:"Asus Vivobook 2 en 1 Core Ultra 7",     descripcion:"256 V, 1 TB, SSD, 16 GB de RAM, pantalla táctil Wuxga 1920 px x 1200 px Intel Arc Graphics",     precio:2787695,   imagen:"Imagenes/Portatil Gamer.png"  },
];

// ──────────────────────────────────────────────
// ESTADO GLOBAL
// ──────────────────────────────────────────────
let carrito = JSON.parse(localStorage.getItem("tecnology_carrito")) || [];
let productosVisibles = 6;
const PASO_CARGA = 3;

const formatPrecio = (n) => "$" + n.toLocaleString("es-CO");

function guardarCarrito() {
  localStorage.setItem("tecnology_carrito", JSON.stringify(carrito));
}

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
function mostrarToast(msg, tipo = "success") {
  let cnt = document.getElementById("toast-contenedor");
  if (!cnt) {
    cnt = document.createElement("div");
    cnt.id = "toast-contenedor";
    Object.assign(cnt.style, {
      position:"fixed", bottom:"30px", right:"30px",
      zIndex:"9999", display:"flex", flexDirection:"column", gap:"10px"
    });
    document.body.appendChild(cnt);
  }
  const t = document.createElement("div");
  const color = tipo === "success" ? "#0cf5ff" : tipo === "remove" ? "#ff3c6f" : "#ff9a00";
  Object.assign(t.style, {
    background:`linear-gradient(135deg,${color}18,#0a0c10cc)`,
    border:`1px solid ${color}`, borderRadius:"14px", padding:"12px 20px",
    color:"#eef2ff", fontFamily:"'Rajdhani',sans-serif", fontSize:"0.9rem",
    backdropFilter:"blur(12px)", display:"flex", alignItems:"center", gap:"10px",
    boxShadow:`0 4px 20px ${color}44`,
    animation:"toastIn 0.35s cubic-bezier(.21,1.02,.73,1) forwards",
    maxWidth:"300px", cursor:"pointer"
  });
  const icon = tipo === "success" ? "✅" : tipo === "remove" ? "🗑️" : "⚠️";
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  if (!document.getElementById("toast-style")) {
    const s = document.createElement("style"); s.id = "toast-style";
    s.textContent = `
      @keyframes toastIn  {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      @keyframes toastOut {from{opacity:1;transform:none}to{opacity:0;transform:translateY(20px)}}
    `;
    document.head.appendChild(s);
  }
  t.addEventListener("click", () => cerrarToast(t));
  cnt.appendChild(t);
  setTimeout(() => cerrarToast(t), 3000);
}
function cerrarToast(t) {
  t.style.animation = "toastOut 0.3s ease forwards";
  setTimeout(() => t.remove(), 300);
}

// ──────────────────────────────────────────────
// BADGE
// ──────────────────────────────────────────────
function actualizarBadge() {
  const total = carrito.reduce((a, p) => a + p.cantidad, 0);
  let badge = document.getElementById("badge-carrito");
  const submenu = document.querySelector(".submenu");
  if (!submenu) return;
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "badge-carrito";
    Object.assign(badge.style, {
      position:"absolute", top:"-6px", right:"-6px",
      background:"linear-gradient(135deg,#ff3c6f,#ff6a47)",
      color:"#fff", borderRadius:"50%", width:"20px", height:"20px",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"0.65rem", fontWeight:"800", boxShadow:"0 0 8px #ff3c6f",
      pointerEvents:"none"
    });
    submenu.style.position = "relative";
    submenu.appendChild(badge);
    if (!document.getElementById("badge-style")) {
      const s = document.createElement("style"); s.id = "badge-style";
      s.textContent = `@keyframes pulseBadge{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}`;
      document.head.appendChild(s);
    }
  }
  badge.textContent = total;
  badge.style.display = total > 0 ? "flex" : "none";
  badge.style.animation = "none"; void badge.offsetWidth;
  badge.style.animation = "pulseBadge 0.3s ease";
}

// ──────────────────────────────────────────────
// RENDERIZAR CARRITO
// ──────────────────────────────────────────────
function renderizarCarrito() {
  const tbody = document.querySelector("#lista-carrito tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (carrito.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#5a6a8a;">🛒 El carrito está vacío</td></tr>`;
    actualizarTotal(); actualizarBadge(); return;
  }
  carrito.forEach(prod => {
    const tr = document.createElement("tr");
    tr.style.animation = "fadeRowIn 0.3s ease";
    tr.innerHTML = `
      <td><img src="${prod.imagen}" style="width:44px;height:38px;object-fit:contain;border-radius:8px" alt=""></td>
      <td>
        <strong style="font-size:0.73rem">${prod.nombre}</strong><br>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <button class="btn-cantidad" data-id="${prod.id}" data-accion="restar"
            style="background:#1e2030;border:1px solid #ff3c6f;color:#ff3c6f;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center">−</button>
          <span style="font-size:0.8rem;min-width:18px;text-align:center">${prod.cantidad}</span>
          <button class="btn-cantidad" data-id="${prod.id}" data-accion="sumar"
            style="background:#1e2030;border:1px solid #0cf5ff;color:#0cf5ff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center">+</button>
        </div>
      </td>
      <td style="color:#ff5e7e;font-weight:700;font-size:0.78rem">${formatPrecio(prod.precio * prod.cantidad)}</td>
      <td><button class="btn-eliminar" data-id="${prod.id}" style="background:none;border:none;color:#ff3c6f;cursor:pointer;font-size:1.1rem">✕</button></td>`;
    tbody.appendChild(tr);
  });
  actualizarTotal(); actualizarBadge(); agregarListenersCarrito();
  if (!document.getElementById("carrito-row-style")) {
    const s = document.createElement("style"); s.id = "carrito-row-style";
    s.textContent = `@keyframes fadeRowIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }
}

function actualizarTotal() {
  const carritoDiv = document.getElementById("carrito");
  if (!carritoDiv) return;
  let totalEl = document.getElementById("carrito-total");
  if (!totalEl) {
    totalEl = document.createElement("div"); totalEl.id = "carrito-total";
    Object.assign(totalEl.style, {
      marginTop:"12px", paddingTop:"10px", borderTop:"1px solid #0cf5ff44",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      color:"#eef2ff", fontWeight:"800", fontSize:"0.9rem"
    });
    const vaciar = document.getElementById("vaciar-carrito");
    if (vaciar) carritoDiv.insertBefore(totalEl, vaciar);
    else carritoDiv.appendChild(totalEl);
  }
  const suma = carrito.reduce((a, p) => a + p.precio * p.cantidad, 0);
  totalEl.innerHTML = `<span>Total:</span><span style="color:#0cf5ff;font-family:'Orbitron',monospace">${formatPrecio(suma)}</span>`;
}

function agregarListenersCarrito() {
  document.querySelectorAll(".btn-cantidad").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const idx = carrito.findIndex(p => p.id === id);
      if (idx === -1) return;
      if (btn.dataset.accion === "sumar") {
        carrito[idx].cantidad++;
        mostrarToast(`+1 ${carrito[idx].nombre}`, "success");
      } else {
        carrito[idx].cantidad--;
        if (carrito[idx].cantidad <= 0) {
          mostrarToast(`${carrito[idx].nombre} eliminado`, "remove");
          carrito.splice(idx, 1);
        }
      }
      guardarCarrito(); renderizarCarrito();
    });
  });
  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const idx = carrito.findIndex(p => p.id === id);
      if (idx !== -1) {
        mostrarToast(`${carrito[idx].nombre} eliminado`, "remove");
        carrito.splice(idx, 1);
        guardarCarrito(); renderizarCarrito();
      }
    });
  });
}

// ──────────────────────────────────────────────
// AGREGAR AL CARRITO
// ──────────────────────────────────────────────
function agregarAlCarrito(id) {
  const prod = todosLosProductos.find(p => p.id === id);
  if (!prod) return;
  const existe = carrito.find(p => p.id === id);
  if (existe) existe.cantidad++;
  else carrito.push({ ...prod, cantidad: 1 });
  guardarCarrito(); renderizarCarrito();
  mostrarToast(`${prod.nombre} agregado 🎮`, "success");
  animarBoton(id);
}

function animarBoton(id) {
  const btn = document.querySelector(`.Agregar-carrito[data-id="${id}"]`);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = "✓ Agregado";
  btn.style.background = "linear-gradient(90deg,#0cf5ff,#0091a8)";
  btn.style.pointerEvents = "none";
  setTimeout(() => { btn.textContent = orig; btn.style.background = ""; btn.style.pointerEvents = ""; }, 1200);
}

// Vaciar carrito
const vaciarBtn = document.getElementById("vaciar-carrito");
if (vaciarBtn) {
  vaciarBtn.addEventListener("click", e => {
    e.preventDefault();
    if (!carrito.length) return;
    carrito = []; guardarCarrito(); renderizarCarrito();
    mostrarToast("Carrito vaciado 🗑️", "remove");
  });
}

// Delegación global para botones agregar
document.addEventListener("click", e => {
  const btn = e.target.closest(".Agregar-carrito");
  if (!btn) return;
  e.preventDefault();
  agregarAlCarrito(parseInt(btn.dataset.id));
});

// ──────────────────────────────────────────────
// CARGAR MÁS (index.html)
// ──────────────────────────────────────────────
const btnCargarMas = document.getElementById("load-more");
if (btnCargarMas) {
  if (!document.getElementById("card-anim-style")) {
    const s = document.createElement("style"); s.id = "card-anim-style";
    s.textContent = `@keyframes cardSlideIn{from{opacity:0;transform:translateY(30px) scale(0.96)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }
  btnCargarMas.addEventListener("click", function () {
    const contenedor = document.getElementById("lista-1");
    const nuevos = todosLosProductos.slice(productosVisibles, productosVisibles + PASO_CARGA);
    if (!nuevos.length) {
      this.textContent = "✓ Todos los productos cargados";
      this.style.opacity = "0.5"; this.style.pointerEvents = "none"; return;
    }
    nuevos.forEach((prod, i) => {
      const div = document.createElement("div");
      div.className = "box";
      div.style.animation = "cardSlideIn 0.4s cubic-bezier(.21,1.02,.73,1) forwards";
      div.style.animationDelay = `${i * 80}ms`;
      div.style.opacity = "0";
      div.innerHTML = `
        <img src="${prod.imagen}" alt="${prod.nombre}">
        <div class="product-txt">
          <h3>${prod.nombre}</h3><p>${prod.descripcion}</p>
          <p class="Precio">${formatPrecio(prod.precio)}</p>
          <a href="#" class="Agregar-carrito btn-3" data-id="${prod.id}">Agregar al carrito</a>
        </div>`;
      contenedor.insertBefore(div, this);
    });
    productosVisibles += nuevos.length;
    if (productosVisibles >= todosLosProductos.length) {
      this.textContent = "✓ Todos los productos cargados";
      this.style.opacity = "0.5"; this.style.pointerEvents = "none";
    }
    mostrarToast(`${nuevos.length} productos cargados`, "success");
  });
}

// ──────────────────────────────────────────────
// FILTROS POR CATEGORÍA (productos.html)
// ──────────────────────────────────────────────
const filtrosBtns = document.querySelectorAll(".filtro-btn");
if (filtrosBtns.length) {
  filtrosBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filtrosBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.cat;
      filtrarProductos(cat, document.getElementById("buscador")?.value || "");
    });
  });
}

// ──────────────────────────────────────────────
// BUSCADOR (productos.html)
// ──────────────────────────────────────────────
const buscador = document.getElementById("buscador");
if (buscador) {
  buscador.addEventListener("input", () => {
    const catActiva = document.querySelector(".filtro-btn.active")?.dataset.cat || "todos";
    filtrarProductos(catActiva, buscador.value.trim());
  });
}

function filtrarProductos(cat, texto) {
  const boxes = document.querySelectorAll("#lista-1 .box");
  const sinResult = document.getElementById("sin-resultados");
  let visibles = 0;
  const q = texto.toLowerCase();

  if (!document.getElementById("card-anim-style")) {
    const s = document.createElement("style"); s.id = "card-anim-style";
    s.textContent = `@keyframes cardSlideIn{from{opacity:0;transform:translateY(30px) scale(0.96)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }

  boxes.forEach(box => {
    const nombre = box.querySelector("h3")?.textContent.toLowerCase() || "";
    const desc   = box.querySelector("p")?.textContent.toLowerCase() || "";
    const boxCat = box.dataset.cat || "";
    const ok = (cat === "todos" || boxCat === cat) && (nombre.includes(q) || desc.includes(q) || q === "");
    if (ok) {
      box.classList.remove("oculto");
      box.style.animation = "cardSlideIn 0.35s ease forwards";
      visibles++;
    } else {
      box.classList.add("oculto");
    }
  });
  if (sinResult) sinResult.style.display = visibles === 0 ? "block" : "none";
}

// ──────────────────────────────────────────────
// ACORDEÓN FAQ (servicios.html)
// ──────────────────────────────────────────────
document.querySelectorAll(".acordeon-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".acordeon-item");
    const estaAbierto = item.classList.contains("abierto");
    document.querySelectorAll(".acordeon-item").forEach(i => i.classList.remove("abierto"));
    if (!estaAbierto) item.classList.add("abierto");
  });
});

// ──────────────────────────────────────────────
// CONTADOR ANIMADO STATS (servicios.html)
// ──────────────────────────────────────────────
function animarContadores() {
  document.querySelectorAll(".stat-num").forEach(el => {
    const target = parseInt(el.dataset.target);
    const step = Math.ceil(target / (1500 / 16));
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString("es-CO");
      if (current >= target) clearInterval(interval);
    }, 16);
  });
}
const statsSection = document.querySelector(".stats-section");
if (statsSection) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animarContadores(); observer.disconnect(); } });
  }, { threshold: 0.4 });
  observer.observe(statsSection);
}

// ──────────────────────────────────────────────
// FORMULARIO CONTACTO (contactos.html)
// ──────────────────────────────────────────────
const formContacto = document.getElementById("form-contacto");
if (formContacto) {
  const textarea = document.getElementById("mensaje");
  const charCounter = document.getElementById("char-counter");
  if (textarea && charCounter) {
    textarea.addEventListener("input", () => {
      const len = textarea.value.length;
      charCounter.textContent = `${len} / 500`;
      charCounter.style.color = len > 450 ? "#ff3c6f" : "#3a4a6a";
      if (len > 500) textarea.value = textarea.value.slice(0, 500);
    });
  }

  formContacto.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarErrores();
    const nombre  = document.getElementById("nombre");
    const email   = document.getElementById("email");
    const asunto  = document.getElementById("asunto");
    const mensaje = document.getElementById("mensaje");
    let valido = true;

    if (!nombre.value.trim() || nombre.value.trim().length < 3) {
      mostrarError("err-nombre", "Ingresa tu nombre completo (mín. 3 caracteres)");
      nombre.classList.add("input-error"); valido = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      mostrarError("err-email", "Ingresa un correo electrónico válido");
      email.classList.add("input-error"); valido = false;
    }
    if (!asunto.value) {
      mostrarError("err-asunto", "Selecciona un asunto");
      asunto.classList.add("input-error"); valido = false;
    }
    if (!mensaje.value.trim() || mensaje.value.trim().length < 10) {
      mostrarError("err-mensaje", "El mensaje debe tener al menos 10 caracteres");
      mensaje.classList.add("input-error"); valido = false;
    }
    if (!valido) return;

    const btnEnviar  = document.getElementById("btn-enviar");
    const btnTexto   = btnEnviar.querySelector(".btn-texto");
    const btnSpinner = btnEnviar.querySelector(".btn-spinner");
    btnEnviar.disabled = true;
    btnTexto.style.display  = "none";
    btnSpinner.style.display = "inline";

    await new Promise(r => setTimeout(r, 1800));

    btnEnviar.disabled = false;
    btnTexto.style.display   = "inline";
    btnSpinner.style.display = "none";

    const exito = document.getElementById("form-exito");
    exito.style.display = "block";
    formContacto.reset();
    if (charCounter) charCounter.textContent = "0 / 500";
    mostrarToast("¡Mensaje enviado con éxito! 📨", "success");
    setTimeout(() => exito.style.display = "none", 5000);
  });

  ["nombre","email","asunto","mensaje"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => {
      document.getElementById(id).classList.remove("input-error");
      const errEl = document.getElementById(`err-${id}`);
      if (errEl) errEl.textContent = "";
    });
  });
}

function mostrarError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function limpiarErrores() {
  ["err-nombre","err-email","err-asunto","err-mensaje"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  ["nombre","email","asunto","mensaje"].forEach(id => {
    document.getElementById(id)?.classList.remove("input-error");
  });
}

// ──────────────────────────────────────────────
// INICIALIZAR
// ──────────────────────────────────────────────
renderizarCarrito();
