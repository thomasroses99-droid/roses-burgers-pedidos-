import { useState, useEffect, useRef } from "react";
import {
  subscribeMenu, subscribeZona,
  getFotoURL, getFotoCached, setFotoCache,
  fmt,
} from "./datos.js";

const WA_NUMBER = "543417408076";
const GD = "#1a3a25"; // verde oscuro
const G  = "#1a7a3a"; // verde medio
const GL = "#e8f5ec"; // verde claro

// ── Geo ───────────────────────────────────────────────────────────
function puntoDentroDePoligono(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
async function geocodificar(dir) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dir)}&limit=1`, { headers: { "Accept-Language": "es" } });
  const d = await r.json();
  return d.length ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) } : null;
}

// ── Hook fotos ────────────────────────────────────────────────────
function useFotos(items, tipo) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    if (!items?.length) return;
    items.forEach(async item => {
      const cached = getFotoCached(tipo, item.id);
      if (cached) { setUrls(p => ({ ...p, [item.id]: cached })); return; }
      const url = await getFotoURL(tipo, item.id);
      if (url) { setFotoCache(tipo, item.id, url); setUrls(p => ({ ...p, [item.id]: url })); }
    });
  }, [items]);
  return urls;
}

// ── Mapa ──────────────────────────────────────────────────────────
function MapaCliente({ coords, zona }) {
  const ref = useRef(null); const mapRef = useRef(null); const mk = useRef(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    import("leaflet").then(Lm => {
      const L = Lm.default || Lm;
      if (!document.getElementById("leaflet-css")) { const l = document.createElement("link"); l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l); }
      const map = L.map(ref.current).setView(coords ? [coords.lat, coords.lng] : [-27.47, -58.83], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      if (zona?.length > 2) L.polygon(zona, { color: G, fillColor: G, fillOpacity: 0.1, weight: 2 }).addTo(map);
      if (coords) { const ic = L.divIcon({ html: `<div style="background:${G};width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0004"></div>`, className: "", iconAnchor: [7, 7] }); mk.current = L.marker([coords.lat, coords.lng], { icon: ic }).addTo(map); }
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    import("leaflet").then(Lm => {
      const L = Lm.default || Lm;
      if (mk.current) mk.current.remove();
      const ic = L.divIcon({ html: `<div style="background:${G};width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0004"></div>`, className: "", iconAnchor: [7, 7] });
      mk.current = L.marker([coords.lat, coords.lng], { icon: ic }).addTo(mapRef.current);
      mapRef.current.setView([coords.lat, coords.lng], 15);
    });
  }, [coords]);
  return <div ref={ref} style={{ height: 185, borderRadius: 12, overflow: "hidden", border: "1px solid #d0e8d8", marginTop: 10 }} />;
}

// ── Modal personalización burger ──────────────────────────────────
function ModalBurger({ burger, fotoUrl, extras, guarniciones, fotoExtras, fotoGuar, onAgregar, onCerrar }) {
  const [tamano, setTamano] = useState("simple");
  const [guarnicion, setGuarnicion] = useState(null);
  const [extrasEleg, setExtrasEleg] = useState([]);

  const tamanos = [
    { key: "simple", label: "Simple",  precio: burger.simple },
    { key: "doble",  label: "Doble",   precio: burger.doble  },
    { key: "triple", label: "Triple",  precio: burger.triple },
  ];
  const tObj = tamanos.find(t => t.key === tamano);
  const gObj = guarniciones.find(g => g.id === guarnicion);
  const extTotal = extrasEleg.reduce((s, id) => s + (extras.find(e => e.id === id)?.precio || 0), 0);
  const total = tObj.precio + (gObj?.precio || 0) + extTotal;

  function toggleExtra(id) { setExtrasEleg(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }

  function agregar() {
    onAgregar({ cartId: Date.now() + Math.random(), tipo: "burger", nombre: burger.nombre, tamano: tObj.label, guarnicion: gObj ? { nombre: `${gObj.nombre} (${gObj.detalle})`, precio: gObj.precio } : null, extras: extrasEleg.map(id => extras.find(e => e.id === id)).filter(Boolean), precio: total });
    onCerrar();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 500, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: "#fff", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Foto */}
        {fotoUrl
          ? <img src={fotoUrl} style={{ width: "100%", height: 210, objectFit: "cover" }} />
          : <div style={{ width: "100%", height: 120, background: GL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>🍔</div>}

        <div style={{ padding: "18px 20px 36px" }}>
          {/* Nombre + tag */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: GD }}>{burger.nombre}</span>
            {burger.tag && <span style={{ background: burger.tag === "NUEVA" ? G : "#8b2e10", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>{burger.tag}</span>}
          </div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 22, lineHeight: 1.5 }}>{burger.desc}</div>

          {/* Tamaño */}
          <Bloque titulo="TAMAÑO">
            <div style={{ display: "flex", gap: 8 }}>
              {tamanos.map(t => (
                <button key={t.key} onClick={() => setTamano(t.key)} style={{ flex: 1, padding: "12px 4px", borderRadius: 12, border: `2px solid ${tamano === t.key ? G : "#e0e0e0"}`, background: tamano === t.key ? GL : "#fff", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: tamano === t.key ? GD : "#555" }}>{t.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tamano === t.key ? G : "#aaa", marginTop: 2 }}>{fmt(t.precio)}</div>
                </button>
              ))}
            </div>
          </Bloque>

          {/* Guarnición */}
          <Bloque titulo="GUARNICIÓN" sub="opcional">
            <OpcionRow label="Sin guarnición" selected={guarnicion === null} onClick={() => setGuarnicion(null)} />
            {guarniciones.filter(g => g.disponible).map(g => (
              <OpcionRow key={g.id} label={g.nombre} sub={g.detalle} precio={g.precio} foto={fotoGuar[g.id]} selected={guarnicion === g.id} onClick={() => setGuarnicion(g.id)} />
            ))}
          </Bloque>

          {/* Extras */}
          {extras.filter(e => e.disponible).length > 0 && (
            <Bloque titulo="EXTRAS" sub="podés elegir varios">
              {extras.filter(e => e.disponible).map(e => {
                const sel = extrasEleg.includes(e.id);
                return (
                  <OpcionRow key={e.id} label={e.nombre} precio={e.precio} foto={fotoExtras[e.id]} selected={sel} checkbox onClick={() => toggleExtra(e.id)} />
                );
              })}
            </Bloque>
          )}

          {/* Total + botón */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #eee" }}>
            <div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Total</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: GD }}>{fmt(total)}</div>
            </div>
            <button onClick={agregar} style={{ background: G, border: "none", borderRadius: 14, padding: "15px 28px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer" }}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bloque({ titulo, sub, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: G, letterSpacing: 1.5, marginBottom: 10 }}>
        {titulo} {sub && <span style={{ color: "#bbb", fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 12 }}>· {sub}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{children}</div>
    </div>
  );
}

function OpcionRow({ label, sub, precio, foto, selected, checkbox, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${selected ? G : "#eee"}`, background: selected ? GL : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
      {checkbox && (
        <span style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${selected ? G : "#ddd"}`, background: selected ? G : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", flexShrink: 0 }}>{selected ? "✓" : ""}</span>
      )}
      {foto && <img src={foto} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
      <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: selected ? GD : "#444" }}>
        {label} {sub && <span style={{ fontWeight: 400, color: "#aaa", fontSize: 12 }}>({sub})</span>}
      </span>
      {precio && <span style={{ fontWeight: 700, fontSize: 13, color: selected ? G : "#aaa" }}>+{fmt(precio)}</span>}
    </button>
  );
}

// ── Pantalla Checkout ─────────────────────────────────────────────
function PantallaCheckout({ carrito, onQuitar, tipo, setTipo, zona, onConfirmar }) {
  const [nombre, setNombre] = useState("");
  const [dir, setDir]       = useState("");
  const [coords, setCoords] = useState(null);
  const [geoSt, setGeoSt]   = useState(null);
  const [pago, setPago]     = useState("");
  const [notas, setNotas]   = useState("");
  const timer = useRef(null);

  const total = carrito.reduce((s, i) => s + i.precio, 0);

  useEffect(() => {
    if (tipo !== "delivery" || dir.trim().length < 8) { setCoords(null); setGeoSt(null); return; }
    setGeoSt("buscando");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const c = await geocodificar(dir);
        if (!c) { setGeoSt("err"); setCoords(null); return; }
        setCoords(c);
        setGeoSt(zona.length > 2 ? (puntoDentroDePoligono(c.lat, c.lng, zona) ? "ok" : "fuera") : "ok");
      } catch { setGeoSt("err"); setCoords(null); }
    }, 1000);
    return () => clearTimeout(timer.current);
  }, [dir, tipo]);

  const valido = nombre.trim() && pago && (tipo === "retiro" || (dir.trim() && geoSt === "ok"));

  const inp = { width: "100%", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "14px 16px", fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box", color: "#1a1a1a" };

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: "20px 16px 0" }}>
        {/* Resumen */}
        <div style={{ fontSize: 13, fontWeight: 800, color: G, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Tu pedido</div>
        {carrito.map(item => (
          <div key={item.cartId} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10, boxShadow: "0 1px 4px #0001" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: GD }}>
                {item.tipo === "burger" ? "🍔" : item.tipo === "guar" ? "🍟" : "🥤"} {item.nombre}
                {item.tamano && <span style={{ fontWeight: 400, color: "#999", fontSize: 13 }}> · {item.tamano}</span>}
              </div>
              {item.guarnicion && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>+ {item.guarnicion.nombre}</div>}
              {item.extras?.map(e => <div key={e.id} style={{ fontSize: 12, color: "#aaa" }}>+ {e.nombre}</div>)}
            </div>
            <div style={{ fontWeight: 700, color: G, fontSize: 14 }}>{fmt(item.precio)}</div>
            <button onClick={() => onQuitar(item.cartId)} style={{ background: "transparent", border: "none", color: "#ccc", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, paddingTop: 8, marginBottom: 24 }}>
          <span style={{ color: "#aaa", fontSize: 14 }}>Total:</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: GD }}>{fmt(total)}</span>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 }}>
          {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro en local"]].map(([v, l]) => (
            <button key={v} onClick={() => setTipo(v)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: tipo === v ? GD : "transparent", color: tipo === v ? "#fff" : "#888", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Tu nombre *</label>
        <input style={{ ...inp, marginBottom: 14 }} placeholder="Ej: Juan García" value={nombre} onChange={e => setNombre(e.target.value)} />

        {tipo === "delivery" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Dirección *</label>
            <input style={inp} placeholder="Ej: San Martín 1234, Corrientes" value={dir} onChange={e => setDir(e.target.value)} />
            {geoSt === "buscando" && <Alerta c="#fffbe6" b="#f0d060" t="#7a5a00">🔍 Buscando dirección...</Alerta>}
            {geoSt === "ok"      && <Alerta c={GL} b={G} t={GD}>✅ Dentro de nuestra zona de delivery</Alerta>}
            {geoSt === "fuera"   && <Alerta c="#fef2f2" b="#fca5a5" t="#991b1b">❌ Fuera de nuestra zona de delivery</Alerta>}
            {geoSt === "err"     && <Alerta c="#fef2f2" b="#fca5a5" t="#991b1b">⚠️ No encontramos esa dirección</Alerta>}
            {(coords || zona.length > 2) && <MapaCliente coords={coords} zona={zona} />}
          </div>
        )}

        <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 8 }}>Método de pago *</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["Efectivo", "Transferencia", "Link de pago"].map(op => (
            <button key={op} onClick={() => setPago(op)} style={{ flex: 1, padding: "12px 4px", borderRadius: 10, border: `1.5px solid ${pago === op ? G : "#e0e0e0"}`, background: pago === op ? GL : "#fff", color: pago === op ? GD : "#aaa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {op}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>Notas (opcional)</label>
        <textarea style={{ ...inp, resize: "vertical", minHeight: 70 }} placeholder="Sin cebolla, extra picante..." value={notas} onChange={e => setNotas(e.target.value)} />
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #eee", padding: "12px 16px" }}>
        <button onClick={() => valido && onConfirmar({ nombre, dir, tipo, pago, notas })} style={{ width: "100%", background: valido ? "#25d366" : "#e0e0e0", border: "none", borderRadius: 16, padding: "17px", fontWeight: 900, fontSize: 16, color: valido ? "#fff" : "#bbb", cursor: valido ? "pointer" : "not-allowed" }}>
          {valido ? `📲 Confirmar por WhatsApp · ${fmt(total)}` : "Completá todos los datos"}
        </button>
      </div>
    </div>
  );
}

function Alerta({ c, b, t, children }) {
  return <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: c, border: `1px solid ${b}`, fontSize: 13, color: t }}>{children}</div>;
}

// ── Página principal ──────────────────────────────────────────────
export default function PaginaCliente() {
  const [menu, setMenu]     = useState(null);
  const [zona, setZona]     = useState([]);
  const [cat, setCat]       = useState("hamburguesas");
  const [modal, setModal]   = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [pantalla, setPant] = useState("menu");
  const [tipo, setTipo]     = useState("delivery");
  const [cantSueltas, setCant] = useState({});

  useEffect(() => {
    const u1 = subscribeMenu(d => setMenu(d));
    const u2 = subscribeZona(z => setZona(z));
    return () => { u1(); u2(); };
  }, []);

  const fB = useFotos(menu?.burgers || [], "burger");
  const fG = useFotos(menu?.guarniciones || [], "guar");
  const fE = useFotos(menu?.extras || [], "extra");
  const fBe = useFotos(menu?.bebidas || [], "bebida");

  const totalItems = carrito.length;
  const totalPrecio = carrito.reduce((s, i) => s + i.precio, 0);

  function agregar(item) { setCarrito(p => [...p, item]); }
  function quitar(cartId) { setCarrito(p => p.filter(i => i.cartId !== cartId)); }

  function cambiarCant(id, delta) { setCant(p => { const n = Math.max(0, (p[id] || 0) + delta); return { ...p, [id]: n }; }); }

  function agregarSueltas(items, tipo) {
    const nuevos = [];
    for (const [id, qty] of Object.entries(cantSueltas)) {
      const it = items.find(x => String(x.id) === String(id));
      if (it && qty > 0) for (let i = 0; i < qty; i++) nuevos.push({ cartId: Date.now() + Math.random(), tipo, nombre: it.nombre + (it.detalle ? ` (${it.detalle})` : ""), precio: it.precio });
    }
    if (nuevos.length) { setCarrito(p => [...p, ...nuevos]); setCant({}); }
  }

  function confirmarPedido({ nombre, dir, tipo: t, pago, notas }) {
    const lineas = ["🍔 *NUEVO PEDIDO - Roses Burgers*", ""];
    lineas.push("📋 *DETALLE:*");
    carrito.forEach(item => {
      if (item.tipo === "burger") {
        lineas.push(`• 🍔 ${item.nombre} (${item.tamano}) — ${fmt(item.precio)}`);
        if (item.guarnicion) lineas.push(`   ↳ + ${item.guarnicion.nombre}`);
        if (item.extras?.length) lineas.push(`   ↳ Extras: ${item.extras.map(e => e.nombre).join(", ")}`);
      } else { lineas.push(`• ${item.tipo === "guar" ? "🍟" : "🥤"} ${item.nombre} — ${fmt(item.precio)}`); }
    });
    lineas.push("", `👤 *Cliente:* ${nombre}`);
    lineas.push(`📦 *Tipo:* ${t === "delivery" ? "🛵 Delivery" : "🏠 Retiro en local"}`);
    if (t === "delivery") lineas.push(`📍 *Dirección:* ${dir}`);
    lineas.push(`💳 *Pago:* ${pago}`);
    if (notas?.trim()) lineas.push(`📝 *Notas:* ${notas.trim()}`);
    lineas.push("", `💰 *TOTAL: ${fmt(totalPrecio)}*`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
  }

  if (!menu) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f6f6f6", gap: 16 }}>
      <div style={{ fontSize: 52 }}>🍔</div>
      <div style={{ color: "#aaa", fontSize: 15 }}>Cargando menú...</div>
    </div>
  );

  const CATS = [
    { key: "hamburguesas", label: "Hamburguesas" },
    { key: "guarniciones", label: "Guarniciones"  },
    { key: "bebidas",      label: "Bebidas"        },
  ].filter(c => {
    const arr = c.key === "hamburguesas" ? menu.burgers : c.key === "guarniciones" ? menu.guarniciones : menu.bebidas;
    return arr?.some(i => i.disponible);
  });

  const itemsCat = {
    hamburguesas: menu.burgers?.filter(i => i.disponible) || [],
    guarniciones: menu.guarniciones?.filter(i => i.disponible) || [],
    bebidas:      menu.bebidas?.filter(i => i.disponible) || [],
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f6", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "#fff", padding: "14px 16px 0", boxShadow: "0 1px 0 #eee", position: "sticky", top: 0, zIndex: 100 }}>
        {/* Fila logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: GD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🍔</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: GD }}>Roses Burgers</span>
          </div>
          {pantalla === "checkout" && (
            <button onClick={() => setPant("menu")} style={{ background: "transparent", border: `1.5px solid ${G}`, borderRadius: 8, padding: "6px 14px", color: G, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ← Volver
            </button>
          )}
        </div>

        {/* Toggle Delivery / Retiro */}
        {pantalla === "menu" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro"]].map(([v, l]) => (
              <button key={v} onClick={() => setTipo(v)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${tipo === v ? GD : "#e0e0e0"}`, background: tipo === v ? GD : "#fff", color: tipo === v ? "#fff" : "#888", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Tabs categorías */}
        {pantalla === "menu" && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none" }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => setCat(c.key)} style={{ padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${cat === c.key ? G : "#e0e0e0"}`, background: cat === c.key ? G : "#fff", color: cat === c.key ? "#fff" : "#666", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENIDO ── */}
      {pantalla === "checkout" ? (
        <PantallaCheckout carrito={carrito} onQuitar={quitar} tipo={tipo} setTipo={setTipo} zona={zona} onConfirmar={confirmarPedido} />
      ) : (
        <div style={{ padding: "16px 0 100px" }}>

          {/* Título sección */}
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a1a", padding: "0 16px", marginBottom: 8 }}>
            {CATS.find(c => c.key === cat)?.label}
          </div>

          {/* ── HAMBURGUESAS ── */}
          {cat === "hamburguesas" && itemsCat.hamburguesas.map((b, idx) => {
            const foto = fB[b.id];
            const enCarrito = carrito.filter(i => i.tipo === "burger" && i.nombre === b.nombre).length;
            return (
              <div key={b.id}>
                <div onClick={() => setModal(b)} style={{ display: "flex", background: "#fff", cursor: "pointer", padding: "14px 16px", gap: 14, alignItems: "center" }}>
                  {/* Imagen */}
                  <div style={{ width: 115, height: 115, borderRadius: 14, overflow: "hidden", background: "#f0f4f2", flexShrink: 0 }}>
                    {foto ? <img src={foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🍔</div>}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a" }}>{b.nombre}</span>
                      {b.tag && <span style={{ background: b.tag === "NUEVA" ? G : "#8b2e10", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{b.tag}</span>}
                      {enCarrito > 0 && <span style={{ background: G, color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 10 }}>×{enCarrito}</span>}
                    </div>
                    {/* Botón + precio */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: GD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 900, lineHeight: 1, flexShrink: 0 }}>+</div>
                      <span style={{ fontWeight: 900, fontSize: 17, color: "#1a1a1a" }}>{fmt(b.simple)}</span>
                    </div>
                    {/* Descripción */}
                    <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.desc}</div>
                  </div>
                </div>
                {idx < itemsCat.hamburguesas.length - 1 && <div style={{ height: 1, background: "#f0f0f0", margin: "0 16px" }} />}
              </div>
            );
          })}

          {/* ── GUARNICIONES ── */}
          {cat === "guarniciones" && (
            <>
              {itemsCat.guarniciones.map((g, idx) => {
                const foto = fG[g.id]; const qty = cantSueltas[g.id] || 0;
                return (
                  <div key={g.id}>
                    <div style={{ display: "flex", background: "#fff", padding: "14px 16px", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 115, height: 100, borderRadius: 14, overflow: "hidden", background: "#f0f4f2", flexShrink: 0 }}>
                        {foto ? <img src={foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🍟</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", marginBottom: 3 }}>{g.nombre}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>{g.detalle}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {qty > 0 ? (
                            <>
                              <button onClick={() => cambiarCant(g.id, -1)} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G}`, background: "#fff", color: G, fontWeight: 900, fontSize: 18, cursor: "pointer" }}>−</button>
                              <span style={{ fontWeight: 800, color: GD, minWidth: 20, textAlign: "center" }}>{qty}</span>
                              <button onClick={() => cambiarCant(g.id, 1)} style={{ width: 32, height: 32, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>+</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => cambiarCant(g.id, 1)} style={{ width: 32, height: 32, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontSize: 22, fontWeight: 900, cursor: "pointer" }}>+</button>
                              <span style={{ fontWeight: 900, fontSize: 17, color: "#1a1a1a" }}>{fmt(g.precio)}</span>
                            </>
                          )}
                          {qty > 0 && <span style={{ fontWeight: 900, fontSize: 15, color: G, marginLeft: 4 }}>{fmt(g.precio)}</span>}
                        </div>
                      </div>
                    </div>
                    {idx < itemsCat.guarniciones.length - 1 && <div style={{ height: 1, background: "#f0f0f0", margin: "0 16px" }} />}
                  </div>
                );
              })}
              {Object.values(cantSueltas).some(v => v > 0) && (
                <div style={{ padding: "12px 16px" }}>
                  <button onClick={() => agregarSueltas(itemsCat.guarniciones, "guar")} style={{ width: "100%", background: G, border: "none", borderRadius: 14, padding: "15px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer" }}>
                    + Agregar al pedido
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── BEBIDAS ── */}
          {cat === "bebidas" && (
            <>
              {itemsCat.bebidas.map((b, idx) => {
                const foto = fBe[b.id]; const qty = cantSueltas[b.id] || 0;
                return (
                  <div key={b.id}>
                    <div style={{ display: "flex", background: "#fff", padding: "14px 16px", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 115, height: 100, borderRadius: 14, overflow: "hidden", background: "#f0f4f2", flexShrink: 0 }}>
                        {foto ? <img src={foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🥤</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", marginBottom: 3 }}>{b.nombre}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>{b.detalle}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {qty > 0 ? (
                            <>
                              <button onClick={() => cambiarCant(b.id, -1)} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${G}`, background: "#fff", color: G, fontWeight: 900, fontSize: 18, cursor: "pointer" }}>−</button>
                              <span style={{ fontWeight: 800, color: GD, minWidth: 20, textAlign: "center" }}>{qty}</span>
                              <button onClick={() => cambiarCant(b.id, 1)} style={{ width: 32, height: 32, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>+</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => cambiarCant(b.id, 1)} style={{ width: 32, height: 32, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontSize: 22, fontWeight: 900, cursor: "pointer" }}>+</button>
                              <span style={{ fontWeight: 900, fontSize: 17, color: "#1a1a1a" }}>{fmt(b.precio)}</span>
                            </>
                          )}
                          {qty > 0 && <span style={{ fontWeight: 900, fontSize: 15, color: G, marginLeft: 4 }}>{fmt(b.precio)}</span>}
                        </div>
                      </div>
                    </div>
                    {idx < itemsCat.bebidas.length - 1 && <div style={{ height: 1, background: "#f0f0f0", margin: "0 16px" }} />}
                  </div>
                );
              })}
              {Object.values(cantSueltas).some(v => v > 0) && (
                <div style={{ padding: "12px 16px" }}>
                  <button onClick={() => agregarSueltas(itemsCat.bebidas, "bebida")} style={{ width: "100%", background: G, border: "none", borderRadius: 14, padding: "15px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer" }}>
                    + Agregar al pedido
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── BARRA INFERIOR ── */}
      {pantalla === "menu" && totalItems > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #eee", padding: "12px 16px" }}>
          <button onClick={() => setPant("checkout")} style={{ width: "100%", background: GD, border: "none", borderRadius: 16, padding: "16px 20px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ background: G, borderRadius: 8, padding: "4px 10px", fontSize: 14 }}>{totalItems}</span>
            <span>Ver pedido</span>
            <span>{fmt(totalPrecio)}</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalBurger burger={modal} fotoUrl={fB[modal.id]} extras={menu.extras} guarniciones={menu.guarniciones} fotoExtras={fE} fotoGuar={fG} onAgregar={agregar} onCerrar={() => setModal(null)} />
      )}
    </div>
  );
}
