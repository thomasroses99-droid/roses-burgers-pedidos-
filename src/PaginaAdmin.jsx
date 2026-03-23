import { useState, useEffect, useRef } from "react";

const ADMIN_PASS = "RosesBurgers2025";
const LS_ZONA_KEY = "rb-zona-delivery";
const LS_MENU_KEY = "rb-menu-publico";
const LS_SESSION = "rb-admin-session";

function loadMenu() {
  try { return JSON.parse(localStorage.getItem(LS_MENU_KEY)) || { hamburguesas: [], extras: [], bebidas: [] }; } catch { return { hamburguesas: [], extras: [], bebidas: [] }; }
}
function saveMenu(m) { localStorage.setItem(LS_MENU_KEY, JSON.stringify(m)); }
function loadZona() {
  try { return JSON.parse(localStorage.getItem(LS_ZONA_KEY)) || []; } catch { return []; }
}
function saveZona(z) { localStorage.setItem(LS_ZONA_KEY, JSON.stringify(z)); }

const categorias = [
  { key: "hamburguesas", label: "Hamburguesas", icon: "🍔" },
  { key: "extras",       label: "Extras",       icon: "🍟" },
  { key: "bebidas",      label: "Bebidas",       icon: "🥤" },
];

// ── Estilos base ──────────────────────────────────────────────────
const G = {
  page: { minHeight: "100vh", background: "#f4f7f5", fontFamily: "'Segoe UI', sans-serif" },
  header: { background: "#1a3a25", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: 900, color: "#e8c96a" },
  card: { background: "#fff", border: "1px solid #d4edd9", borderRadius: 12, padding: "16px 20px", marginBottom: 12 },
  label: { fontSize: 12, color: "#666", display: "block", marginBottom: 5 },
  input: { border: "1px solid #ccc", borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg = "#1a7a3a", txt = "#fff") => ({ background: bg, color: txt, border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }),
  tab: (active) => ({ padding: "9px 20px", borderRadius: 8, border: "1px solid", borderColor: active ? "#1a7a3a" : "#ccc", background: active ? "#1a7a3a" : "#fff", color: active ? "#fff" : "#666", fontWeight: 700, fontSize: 13, cursor: "pointer" }),
};

// ── Login ─────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);

  function intentar() {
    if (pass === ADMIN_PASS) { localStorage.setItem(LS_SESSION, "1"); onLogin(); }
    else { setError(true); setTimeout(() => setError(false), 2000); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a3a25" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 340, textAlign: "center", boxShadow: "0 8px 40px #0004" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🍔</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#1a3a25", marginBottom: 4 }}>Roses Burgers</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 28 }}>Panel de administración</div>
        <input
          type="password"
          style={{ ...G.input, marginBottom: 12, textAlign: "center", fontSize: 16 }}
          placeholder="Contraseña"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && intentar()}
          autoFocus
        />
        {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>Contraseña incorrecta</div>}
        <button onClick={intentar} style={{ ...G.btn(), width: "100%", padding: "12px", fontSize: 15 }}>Entrar</button>
      </div>
    </div>
  );
}

// ── Mapa admin ────────────────────────────────────────────────────
function MapaAdmin({ zona, onGuardar, onLimpiar }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const drawnRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    import("leaflet").then(Lmod => {
      const L = Lmod.default || Lmod;
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(ref.current).setView([-27.47, -58.83], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);

      // Mostrar zona guardada
      if (zona.length > 2) {
        L.polygon(zona, { color: "#1a7a3a", fillColor: "#1a7a3a", fillOpacity: 0.15, weight: 2 }).addTo(map);
        map.fitBounds(zona);
      }

      const puntos = [];
      const markers = [];
      let polyLine = null;

      map.on("click", e => {
        const { lat, lng } = e.latlng;
        puntos.push([lat, lng]);
        markers.push(L.circleMarker([lat, lng], { radius: 5, color: "#1a7a3a", fillColor: "#1a7a3a", fillOpacity: 1 }).addTo(map));
        if (polyLine) polyLine.remove();
        if (puntos.length > 1) polyLine = L.polyline([...puntos, puntos[0]], { color: "#1a7a3a", weight: 2 }).addTo(map);
      });

      drawnRef.current = { puntos, markers, getLine: () => polyLine };
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; drawnRef.current = null; } };
  }, []);

  function guardar() {
    const dl = drawnRef.current;
    if (!dl || dl.puntos.length < 3) { alert("Marcá al menos 3 puntos en el mapa"); return; }
    onGuardar([...dl.puntos]);
  }

  function limpiar() {
    const dl = drawnRef.current;
    if (dl) { dl.markers.forEach(m => m.remove()); dl.markers.length = 0; dl.puntos.length = 0; const pl = dl.getLine(); if (pl) pl.remove(); }
    onLimpiar();
  }

  return (
    <div>
      <div style={{ background: "#e8f5ec", border: "1px solid #a8d5b5", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: "#1a3a25" }}>
        <strong>Cómo usar:</strong> Hacé click en el mapa para marcar los puntos que delimitan tu zona de delivery. Cuantos más puntos, más precisa la zona. Cuando termines hacé click en <strong>Guardar zona</strong>.
        {zona.length > 2 && <span style={{ color: "#1a7a3a", fontWeight: 700 }}> ✅ Zona guardada con {zona.length} puntos.</span>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button style={G.btn()} onClick={guardar}>✅ Guardar zona</button>
        <button style={G.btn("#dc2626")} onClick={limpiar}>🗑 Limpiar y redibujar</button>
      </div>
      <div ref={ref} style={{ height: 460, borderRadius: 12, overflow: "hidden", border: "1px solid #d4edd9" }} />
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────
export default function PaginaAdmin() {
  const [logueado, setLogueado] = useState(() => localStorage.getItem(LS_SESSION) === "1");
  const [tab, setTab] = useState(0);
  const [menu, setMenu] = useState(loadMenu);
  const [zona, setZona] = useState(loadZona);
  const [nuevo, setNuevo] = useState({ nombre: "", descripcion: "", precio: "", categoria: "hamburguesas" });
  const [guardado, setGuardado] = useState(false);

  function flash() { setGuardado(true); setTimeout(() => setGuardado(false), 2000); }

  function agregarItem() {
    if (!nuevo.nombre.trim()) return;
    const item = { id: Date.now(), nombre: nuevo.nombre.trim(), descripcion: nuevo.descripcion.trim(), precio: parseFloat(nuevo.precio) || 0, disponible: true };
    const m = { ...menu, [nuevo.categoria]: [...(menu[nuevo.categoria] || []), item] };
    setMenu(m); saveMenu(m); flash();
    setNuevo(p => ({ ...p, nombre: "", descripcion: "", precio: "" }));
  }

  function toggleDisp(cat, id) {
    const m = { ...menu, [cat]: menu[cat].map(i => i.id === id ? { ...i, disponible: !i.disponible } : i) };
    setMenu(m); saveMenu(m);
  }

  function eliminar(cat, id) {
    if (!confirm("¿Eliminar este producto?")) return;
    const m = { ...menu, [cat]: menu[cat].filter(i => i.id !== id) };
    setMenu(m); saveMenu(m);
  }

  function editarPrecio(cat, id, precio) {
    const m = { ...menu, [cat]: menu[cat].map(i => i.id === id ? { ...i, precio: parseFloat(precio) || 0 } : i) };
    setMenu(m); saveMenu(m);
  }

  function editarNombre(cat, id, nombre) {
    const m = { ...menu, [cat]: menu[cat].map(i => i.id === id ? { ...i, nombre } : i) };
    setMenu(m); saveMenu(m);
  }

  function editarDesc(cat, id, desc) {
    const m = { ...menu, [cat]: menu[cat].map(i => i.id === id ? { ...i, descripcion: desc } : i) };
    setMenu(m); saveMenu(m);
  }

  function guardarZona(z) { setZona(z); saveZona(z); flash(); }
  function limpiarZona() { setZona([]); saveZona([]); }

  function logout() { localStorage.removeItem(LS_SESSION); setLogueado(false); }

  if (!logueado) return <Login onLogin={() => setLogueado(true)} />;

  const urlCliente = `${window.location.origin}/`;

  const inputSt = { ...G.input, fontSize: 13 };
  const cardItemSt = { background: "#fff", border: "1px solid #d4edd9", borderRadius: 10, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" };

  return (
    <div style={G.page}>
      {/* Header */}
      <div style={G.header}>
        <div>
          <div style={G.title}>🍔 Roses Burgers — Admin</div>
          <div style={{ fontSize: 12, color: "#a8d5b5", marginTop: 2 }}>Panel de pedidos online</div>
        </div>
        <button onClick={logout} style={{ ...G.btn("#ffffff22", "#fff"), fontSize: 12 }}>Cerrar sesión</button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>

        {/* Link del cliente */}
        <div style={{ ...G.card, background: "#e8f5ec", borderColor: "#a8d5b5", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3a25", marginBottom: 8 }}>🔗 Link para compartir con tus clientes</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <code style={{ background: "#fff", border: "1px solid #c0dcc8", borderRadius: 8, padding: "8px 14px", fontSize: 14, color: "#1a7a3a", flex: 1, wordBreak: "break-all" }}>{urlCliente}</code>
            <button style={G.btn()} onClick={() => navigator.clipboard.writeText(urlCliente)}>📋 Copiar</button>
            <button style={G.btn("#2563eb")} onClick={() => window.open(urlCliente, "_blank")}>🔍 Ver página</button>
          </div>
          <div style={{ fontSize: 11, color: "#5a8a6a", marginTop: 8 }}>Compartí este link por WhatsApp, Instagram o donde quieras. No necesitan contraseña.</div>
        </div>

        {guardado && (
          <div style={{ background: "#e8f5ec", border: "1px solid #1a7a3a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontWeight: 700, color: "#1a7a3a", fontSize: 13 }}>
            ✅ Guardado correctamente
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["📋 Menú", "🗺️ Zona de Delivery"].map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={G.tab(tab === i)}>{t}</button>
          ))}
        </div>

        {/* ── MENÚ ── */}
        {tab === 0 && (
          <div>
            {/* Agregar */}
            <div style={G.card}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a3a25", marginBottom: 14 }}>➕ Agregar producto al menú</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 160px" }}>
                  <label style={G.label}>Nombre *</label>
                  <input style={inputSt} placeholder="Ej: Clásica Doble" value={nuevo.nombre} onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))} onKeyDown={e => e.key === "Enter" && agregarItem()} />
                </div>
                <div style={{ flex: "3 1 200px" }}>
                  <label style={G.label}>Descripción</label>
                  <input style={inputSt} placeholder="Ingredientes, tamaño..." value={nuevo.descripcion} onChange={e => setNuevo(p => ({ ...p, descripcion: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 110px" }}>
                  <label style={G.label}>Precio ($)</label>
                  <input style={inputSt} type="number" placeholder="0" value={nuevo.precio} onChange={e => setNuevo(p => ({ ...p, precio: e.target.value }))} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={G.label}>Categoría</label>
                  <select style={inputSt} value={nuevo.categoria} onChange={e => setNuevo(p => ({ ...p, categoria: e.target.value }))}>
                    {categorias.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <button style={{ ...G.btn(), padding: "10px 20px", flexShrink: 0 }} onClick={agregarItem}>Agregar</button>
              </div>
            </div>

            {/* Listado */}
            {categorias.map(cat => (
              <div key={cat.key} style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a3a25", marginBottom: 12 }}>
                  {cat.icon} {cat.label} <span style={{ fontWeight: 400, color: "#888", fontSize: 12 }}>({(menu[cat.key] || []).length} productos)</span>
                </div>
                {!(menu[cat.key] || []).length && <div style={{ color: "#aaa", fontSize: 13, paddingBottom: 8 }}>Sin productos en esta categoría</div>}
                {(menu[cat.key] || []).map(item => (
                  <div key={item.id} style={{ ...cardItemSt, opacity: item.disponible ? 1 : 0.5 }}>
                    <div style={{ flex: "2 1 150px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <input style={{ ...inputSt, fontWeight: 700 }} value={item.nombre} onChange={e => editarNombre(cat.key, item.id, e.target.value)} onBlur={() => saveMenu(menu)} />
                      <input style={{ ...inputSt, fontSize: 12, color: "#666" }} value={item.descripcion} placeholder="Descripción..." onChange={e => editarDesc(cat.key, item.id, e.target.value)} onBlur={() => saveMenu(menu)} />
                    </div>
                    <div style={{ flex: "1 1 120px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, color: "#888" }}>$</span>
                      <input type="number" style={{ ...inputSt, textAlign: "right" }} value={item.precio} onChange={e => editarPrecio(cat.key, item.id, e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4 }}>
                      <button style={G.btn(item.disponible ? "#f59e0b" : "#1a7a3a")} onClick={() => toggleDisp(cat.key, item.id)}>
                        {item.disponible ? "Ocultar" : "Mostrar"}
                      </button>
                      <button style={G.btn("#dc2626")} onClick={() => eliminar(cat.key, item.id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── ZONA ── */}
        {tab === 1 && (
          <MapaAdmin zona={zona} onGuardar={guardarZona} onLimpiar={limpiarZona} />
        )}
      </div>
    </div>
  );
}
