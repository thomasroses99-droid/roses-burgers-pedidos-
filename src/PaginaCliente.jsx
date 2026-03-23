import { useState, useEffect, useRef } from "react";
import {
  subscribeMenu, subscribeZona,
  getFotoURL, getFotoCached, setFotoCache,
  fmt,
} from "./datos.js";

const WA_NUMBER = "543417408076";

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

// ── Hook: carga URLs de fotos desde Firebase Storage ─────────────
function useFotos(items, tipo) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    if (!items.length) return;
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
  const ref = useRef(null); const mapRef = useRef(null); const markerRef = useRef(null);
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    import("leaflet").then(Lmod => {
      const L = Lmod.default || Lmod;
      if (!document.getElementById("leaflet-css")) { const l = document.createElement("link"); l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(l); }
      const map = L.map(ref.current).setView(coords ? [coords.lat, coords.lng] : [-27.47, -58.83], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      if (zona?.length > 2) L.polygon(zona, { color: "#1a7a3a", fillColor: "#1a7a3a", fillOpacity: 0.1, weight: 2 }).addTo(map);
      if (coords) { const ic = L.divIcon({ html: '<div style="background:#1a7a3a;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0004"></div>', className: "", iconAnchor: [7, 7] }); markerRef.current = L.marker([coords.lat, coords.lng], { icon: ic }).addTo(map); }
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    import("leaflet").then(Lmod => {
      const L = Lmod.default || Lmod;
      if (markerRef.current) markerRef.current.remove();
      const ic = L.divIcon({ html: '<div style="background:#1a7a3a;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0004"></div>', className: "", iconAnchor: [7, 7] });
      markerRef.current = L.marker([coords.lat, coords.lng], { icon: ic }).addTo(mapRef.current);
      mapRef.current.setView([coords.lat, coords.lng], 15);
    });
  }, [coords]);
  return <div ref={ref} style={{ height: 190, borderRadius: 12, overflow: "hidden", border: "1px solid #c8e6d0", marginTop: 10 }} />;
}

// ── Colores ───────────────────────────────────────────────────────
const G = "#1a7a3a";
const GD = "#1a3a25";
const GL = "#e8f5ec";
const GBORDER = "#d0e8d8";

// ── Modal personalización burger ──────────────────────────────────
function ModalBurger({ burger, fotoUrl, extras, guarniciones, fotoExtras, fotoGuar, onAgregar, onCerrar }) {
  const [tamano, setTamano]       = useState("simple");
  const [guarnicion, setGuarnicion] = useState(null);
  const [extrasEleg, setExtrasEleg] = useState([]);

  const tamanos = [
    { key: "simple", label: "Simple",  precio: burger.simple },
    { key: "doble",  label: "Doble",   precio: burger.doble  },
    { key: "triple", label: "Triple",  precio: burger.triple },
  ];
  const tObj = tamanos.find(t => t.key === tamano);
  const gObj = guarniciones.find(g => g.id === guarnicion);
  const extrasTotal = extrasEleg.reduce((s, id) => s + (extras.find(e => e.id === id)?.precio || 0), 0);
  const total = tObj.precio + (gObj?.precio || 0) + extrasTotal;

  function toggleExtra(id) { setExtrasEleg(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }

  function agregar() {
    onAgregar({
      cartId: Date.now() + Math.random(), tipo: "burger", nombre: burger.nombre,
      tamano: tObj.label,
      guarnicion: gObj ? { nombre: `${gObj.nombre} (${gObj.detalle})`, precio: gObj.precio } : null,
      extras: extrasEleg.map(id => extras.find(e => e.id === id)).filter(Boolean),
      precio: total,
    });
    onCerrar();
  }

  const tagColor = burger.tag === "NUEVA" ? "#1a5c2a" : "#8b2e10";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 500, display: "flex", alignItems: "flex-end" }} onClick={onCerrar}>
      <div style={{ background: "#fff", borderRadius: "22px 22px 0 0", width: "100%", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Foto grande */}
        {fotoUrl
          ? <img src={fotoUrl} style={{ width: "100%", height: 220, objectFit: "cover" }} />
          : <div style={{ width: "100%", height: 120, background: GL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🍔</div>}

        <div style={{ padding: "18px 20px 36px" }}>
          {/* Nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: GD }}>{burger.nombre}</div>
            {burger.tag && <span style={{ background: tagColor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>{burger.tag}</span>}
          </div>
          <div style={{ fontSize: 13, color: "#777", marginBottom: 22, lineHeight: 1.5 }}>{burger.desc}</div>

          {/* Tamaño */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: G, letterSpacing: 1.5, marginBottom: 10 }}>TAMAÑO</div>
            <div style={{ display: "flex", gap: 8 }}>
              {tamanos.map(t => (
                <button key={t.key} onClick={() => setTamano(t.key)} style={{ flex: 1, padding: "12px 4px", borderRadius: 12, border: `2px solid ${tamano === t.key ? G : GBORDER}`, background: tamano === t.key ? GL : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.1s" }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: tamano === t.key ? GD : "#555" }}>{t.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tamano === t.key ? G : "#999", marginTop: 2 }}>{fmt(t.precio)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Guarnición */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: G, letterSpacing: 1.5, marginBottom: 10 }}>GUARNICIÓN <span style={{ color: "#bbb", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· opcional</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => setGuarnicion(null)} style={{ padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${guarnicion === null ? G : GBORDER}`, background: guarnicion === null ? GL : "#fff", color: guarnicion === null ? GD : "#666", cursor: "pointer", textAlign: "left", fontWeight: 600, fontSize: 14 }}>
                Sin guarnición
              </button>
              {guarniciones.filter(g => g.disponible).map(g => {
                const sel = guarnicion === g.id;
                const fG = fotoGuar[g.id];
                return (
                  <button key={g.id} onClick={() => setGuarnicion(g.id)} style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${sel ? G : GBORDER}`, background: sel ? GL : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    {fG ? <img src={fG} style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 42, height: 42, borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🍟</div>}
                    <span style={{ flex: 1, textAlign: "left", fontWeight: 600, fontSize: 14, color: sel ? GD : "#444" }}>{g.nombre} <span style={{ fontWeight: 400, color: "#999", fontSize: 12 }}>({g.detalle})</span></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: sel ? G : "#999" }}>+{fmt(g.precio)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          {extras.filter(e => e.disponible).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: G, letterSpacing: 1.5, marginBottom: 10 }}>EXTRAS <span style={{ color: "#bbb", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· podés elegir varios</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {extras.filter(e => e.disponible).map(e => {
                  const sel = extrasEleg.includes(e.id);
                  const fE = fotoExtras[e.id];
                  return (
                    <button key={e.id} onClick={() => toggleExtra(e.id)} style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${sel ? G : GBORDER}`, background: sel ? GL : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      {fE ? <img src={fE} style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 42, height: 42, borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>➕</div>}
                      <span style={{ flex: 1, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${sel ? G : GBORDER}`, background: sel ? G : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", flexShrink: 0 }}>{sel ? "✓" : ""}</span>
                        <span style={{ fontWeight: 600, fontSize: 14, color: sel ? GD : "#444" }}>{e.nombre}</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: sel ? G : "#999" }}>+{fmt(e.precio)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total + botón */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: `1px solid ${GBORDER}` }}>
            <div>
              <div style={{ fontSize: 11, color: "#999" }}>Total</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: GD }}>{fmt(total)}</div>
            </div>
            <button onClick={agregar} style={{ background: G, border: "none", borderRadius: 14, padding: "15px 30px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer" }}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pantalla de datos del pedido ──────────────────────────────────
function PantallaCheckout({ carrito, onQuitar, tipo, setTipo, zona, onConfirmar }) {
  const [nombre, setNombre]   = useState("");
  const [direccion, setDir]   = useState("");
  const [coords, setCoords]   = useState(null);
  const [geoStatus, setGeo]   = useState(null);
  const [pago, setPago]       = useState("");
  const [notas, setNotas]     = useState("");
  const timer = useRef(null);

  const totalPrecio = carrito.reduce((s, i) => s + i.precio, 0);

  useEffect(() => {
    if (tipo !== "delivery" || direccion.trim().length < 8) { setCoords(null); setGeo(null); return; }
    setGeo("buscando");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const c = await geocodificar(direccion);
        if (!c) { setGeo("err"); setCoords(null); return; }
        setCoords(c);
        setGeo(zona.length > 2 ? (puntoDentroDePoligono(c.lat, c.lng, zona) ? "ok" : "fuera") : "ok");
      } catch { setGeo("err"); setCoords(null); }
    }, 1000);
    return () => clearTimeout(timer.current);
  }, [direccion, tipo]);

  const valido = nombre.trim() && pago && (tipo === "retiro" || (direccion.trim() && geoStatus === "ok"));

  function confirmar() {
    if (!valido) return;
    onConfirmar({ nombre, direccion, tipo, pago, notas });
  }

  const inp = { width: "100%", border: `1.5px solid ${GBORDER}`, borderRadius: 12, padding: "14px 16px", fontSize: 15, outline: "none", background: "#fff", boxSizing: "border-box", color: "#1a1a1a" };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Resumen del pedido */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: G, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Tu pedido</div>
        {carrito.map(item => (
          <div key={item.cartId} style={{ background: "#fff", border: `1px solid ${GBORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: GD }}>
                {item.tipo === "burger" ? "🍔" : item.tipo === "guar" ? "🍟" : "🥤"} {item.nombre}
                {item.tamano && <span style={{ fontWeight: 400, color: "#888", fontSize: 13 }}> · {item.tamano}</span>}
              </div>
              {item.guarnicion && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>+ {item.guarnicion.nombre}</div>}
              {item.extras?.map(e => <div key={e.id} style={{ fontSize: 12, color: "#888" }}>+ {e.nombre}</div>)}
            </div>
            <div style={{ fontWeight: 700, color: G, fontSize: 14 }}>{fmt(item.precio)}</div>
            <button onClick={() => onQuitar(item.cartId)} style={{ background: "transparent", border: "none", color: "#ccc", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, paddingTop: 8, borderTop: `1px solid ${GBORDER}` }}>
          <span style={{ color: "#888", fontSize: 14 }}>Total:</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: GD }}>{fmt(totalPrecio)}</span>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: G, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Datos de entrega</div>

        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Tu nombre *</label>
        <input style={{ ...inp, marginBottom: 16 }} placeholder="Ej: Juan García" value={nombre} onChange={e => setNombre(e.target.value)} />

        {/* Toggle delivery/retiro */}
        <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 }}>
          {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro en local"]].map(([v, l]) => (
            <button key={v} onClick={() => setTipo(v)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: tipo === v ? GD : "transparent", color: tipo === v ? "#fff" : "#666", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
              {l}
            </button>
          ))}
        </div>

        {tipo === "delivery" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Dirección *</label>
            <input style={inp} placeholder="Ej: Av. Corrientes 1234, Corrientes" value={direccion} onChange={e => setDir(e.target.value)} />
            {geoStatus === "buscando" && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#fffbe6", border: "1px solid #f0d060", fontSize: 13, color: "#7a5a00" }}>🔍 Buscando dirección...</div>}
            {geoStatus === "ok"      && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: GL, border: `1px solid ${G}`, fontSize: 13, color: GD }}>✅ Dirección dentro de nuestra zona</div>}
            {geoStatus === "fuera"   && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: 13, color: "#991b1b" }}>❌ Fuera de nuestra zona de delivery</div>}
            {geoStatus === "err"     && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: 13, color: "#991b1b" }}>⚠️ No encontramos esa dirección</div>}
            {(coords || zona.length > 2) && <MapaCliente coords={coords} zona={zona} />}
          </div>
        )}

        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 8 }}>Método de pago *</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["Efectivo", "Transferencia", "Link de pago"].map(op => (
            <button key={op} onClick={() => setPago(op)} style={{ flex: 1, padding: "12px 4px", borderRadius: 10, border: `1.5px solid ${pago === op ? G : GBORDER}`, background: pago === op ? GL : "#fff", color: pago === op ? GD : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {op}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Notas (opcional)</label>
        <textarea style={{ ...inp, resize: "vertical", minHeight: 72 }} placeholder="Sin cebolla, extra picante..." value={notas} onChange={e => setNotas(e.target.value)} />
      </div>

      {/* Botón confirmar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${GBORDER}`, padding: "12px 16px" }}>
        <button onClick={confirmar} disabled={!valido} style={{ width: "100%", background: valido ? "#25d366" : "#e0e0e0", border: "none", borderRadius: 16, padding: "17px", fontWeight: 900, fontSize: 16, color: valido ? "#fff" : "#aaa", cursor: valido ? "pointer" : "not-allowed" }}>
          {valido ? `📲 Confirmar por WhatsApp · ${fmt(carrito.reduce((s, i) => s + i.precio, 0))}` : "Completá todos los datos"}
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function PaginaCliente() {
  const [menu, setMenu]   = useState(null);
  const [zona, setZona]   = useState([]);
  const [catActiva, setCat] = useState("hamburguesas");
  const [modalBurger, setModal] = useState(null);
  const [carrito, setCarrito]   = useState([]);
  const [pantalla, setPantalla] = useState("menu"); // menu | checkout
  const [tipo, setTipo]         = useState("delivery");

  // Suscripción Firebase
  useEffect(() => {
    const unsubMenu = subscribeMenu(data => setMenu(data));
    const unsubZona = subscribeZona(z => setZona(z));
    return () => { unsubMenu(); unsubZona(); };
  }, []);

  // Fotos
  const fotosBurger = useFotos(menu?.burgers || [], "burger");
  const fotosGuar   = useFotos(menu?.guarniciones || [], "guar");
  const fotosExtra  = useFotos(menu?.extras || [], "extra");
  const fotosBebida = useFotos(menu?.bebidas || [], "bebida");

  const totalItems  = carrito.length;
  const totalPrecio = carrito.reduce((s, i) => s + i.precio, 0);

  function agregar(item) { setCarrito(p => [...p, item]); }
  function quitar(cartId) { setCarrito(p => p.filter(i => i.cartId !== cartId)); }

  function confirmarPedido({ nombre, direccion, tipo: t, pago, notas }) {
    const lineas = ["🍔 *NUEVO PEDIDO - Roses Burgers*", ""];
    lineas.push("📋 *DETALLE:*");
    carrito.forEach(item => {
      if (item.tipo === "burger") {
        lineas.push(`• 🍔 ${item.nombre} (${item.tamano}) — ${fmt(item.precio)}`);
        if (item.guarnicion) lineas.push(`   ↳ + ${item.guarnicion.nombre}`);
        if (item.extras?.length) lineas.push(`   ↳ Extras: ${item.extras.map(e => e.nombre).join(", ")}`);
      } else {
        lineas.push(`• ${item.tipo === "guar" ? "🍟" : "🥤"} ${item.nombre} — ${fmt(item.precio)}`);
      }
    });
    lineas.push("", `👤 *Cliente:* ${nombre}`);
    lineas.push(`📦 *Tipo:* ${t === "delivery" ? "🛵 Delivery" : "🏠 Retiro en local"}`);
    if (t === "delivery") lineas.push(`📍 *Dirección:* ${direccion}`);
    lineas.push(`💳 *Pago:* ${pago}`);
    if (notas?.trim()) lineas.push(`📝 *Notas:* ${notas.trim()}`);
    lineas.push("", `💰 *TOTAL: ${fmt(totalPrecio)}*`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
  }

  // Categorías con items disponibles
  const CATS = [
    { key: "hamburguesas", label: "Hamburguesas", icon: "🍔" },
    { key: "guarniciones", label: "Guarniciones",  icon: "🍟" },
    { key: "bebidas",      label: "Bebidas",        icon: "🥤" },
  ].filter(c => menu?.[c.key]?.some(i => i.disponible));

  const itemsCat = {
    hamburguesas: menu?.burgers?.filter(i => i.disponible) || [],
    guarniciones: menu?.guarniciones?.filter(i => i.disponible) || [],
    bebidas:      menu?.bebidas?.filter(i => i.disponible) || [],
  };
  const [cantSueltas, setCantSueltas] = useState({});

  function cambiarCant(id, delta) {
    setCantSueltas(p => { const n = Math.max(0, (p[id] || 0) + delta); return { ...p, [id]: n }; });
  }
  function agregarSueltas(items, tipo) {
    const nuevos = [];
    for (const [id, qty] of Object.entries(cantSueltas)) {
      const it = items.find(x => String(x.id) === String(id));
      if (it && qty > 0) {
        for (let i = 0; i < qty; i++) nuevos.push({ cartId: Date.now() + Math.random(), tipo, nombre: it.nombre + (it.detalle ? ` (${it.detalle})` : ""), precio: it.precio });
      }
    }
    if (nuevos.length) { setCarrito(p => [...p, ...nuevos]); setCantSueltas({}); }
  }

  if (!menu) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f9f6", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🍔</div>
      <div style={{ color: "#888", fontSize: 15 }}>Cargando menú...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f4f9f6", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 480, margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ background: GD, padding: "14px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🍔</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#fff", letterSpacing: -0.3 }}>Roses Burgers</div>
              <div style={{ fontSize: 11, color: "#6ab88a" }}>Pedidos online</div>
            </div>
          </div>
          {pantalla === "menu" && totalItems > 0 && (
            <button onClick={() => setPantalla("checkout")} style={{ background: G, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              🛒 <span style={{ background: "#fff", color: G, borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{totalItems}</span>
            </button>
          )}
          {pantalla === "checkout" && (
            <button onClick={() => setPantalla("menu")} style={{ background: "transparent", border: "none", color: "#6ab88a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              ← Volver
            </button>
          )}
        </div>

        {/* Toggle delivery/retiro (solo en menú) */}
        {pantalla === "menu" && (
          <div style={{ display: "flex", background: "#0003", borderRadius: 12, padding: 4, marginTop: 12, gap: 4 }}>
            {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro"]].map(([v, l]) => (
              <button key={v} onClick={() => setTipo(v)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: tipo === v ? "#fff" : "transparent", color: tipo === v ? GD : "#a8d5b5", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {pantalla === "checkout" ? (
        <PantallaCheckout carrito={carrito} onQuitar={quitar} tipo={tipo} setTipo={setTipo} zona={zona} onConfirmar={confirmarPedido} />
      ) : (
        <>
          {/* ── TABS DE CATEGORÍA ── */}
          <div style={{ background: "#fff", borderBottom: `1px solid ${GBORDER}`, padding: "0 16px", display: "flex", gap: 0, overflowX: "auto" }}>
            {CATS.map(cat => (
              <button key={cat.key} onClick={() => setCat(cat.key)} style={{ padding: "14px 18px", border: "none", background: "transparent", fontWeight: catActiva === cat.key ? 700 : 500, fontSize: 14, color: catActiva === cat.key ? G : "#888", borderBottom: `3px solid ${catActiva === cat.key ? G : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* ── LISTA DE ITEMS ── */}
          <div style={{ padding: "12px 16px" }}>

            {/* HAMBURGUESAS */}
            {catActiva === "hamburguesas" && itemsCat.hamburguesas.map(b => {
              const foto = fotosBurger[b.id];
              const enCarrito = carrito.filter(i => i.tipo === "burger" && i.nombre === b.nombre).length;
              const tagColor = b.tag === "NUEVA" ? "#1a5c2a" : "#8b2e10";
              return (
                <div key={b.id} onClick={() => setModal(b)} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, display: "flex", overflow: "hidden", boxShadow: "0 1px 4px #0001", cursor: "pointer", border: enCarrito > 0 ? `2px solid ${G}` : "2px solid transparent" }}>
                  {/* Foto */}
                  <div style={{ width: 110, height: 110, flexShrink: 0, background: "#f0f4f2", overflow: "hidden" }}>
                    {foto
                      ? <img src={foto} alt={b.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🍔</div>}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: GD }}>{b.nombre}</span>
                        {b.tag && <span style={{ background: tagColor, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{b.tag}</span>}
                        {enCarrito > 0 && <span style={{ background: G, color: "#fff", fontSize: 10, fontWeight: 900, padding: "1px 7px", borderRadius: 10 }}>×{enCarrito}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#999", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.desc}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#bbb" }}>desde</div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: GD }}>{fmt(b.simple)}</div>
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: GD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>+</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* GUARNICIONES */}
            {catActiva === "guarniciones" && (
              <>
                {itemsCat.guarniciones.map(g => {
                  const foto = fotosGuar[g.id];
                  const qty = cantSueltas[g.id] || 0;
                  return (
                    <div key={g.id} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, display: "flex", overflow: "hidden", boxShadow: "0 1px 4px #0001", border: qty > 0 ? `2px solid ${G}` : "2px solid transparent" }}>
                      <div style={{ width: 110, height: 100, flexShrink: 0, background: "#f0f4f2" }}>
                        {foto ? <img src={foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🍟</div>}
                      </div>
                      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: GD }}>{g.nombre}</div>
                          <div style={{ fontSize: 12, color: "#999" }}>{g.detalle}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 900, fontSize: 16, color: GD }}>{fmt(g.precio)}</div>
                          {qty > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <button onClick={() => cambiarCant(g.id, -1)} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${G}`, background: "#fff", color: G, fontWeight: 900, fontSize: 18, cursor: "pointer" }}>−</button>
                              <span style={{ fontWeight: 800, color: GD }}>{qty}</span>
                              <button onClick={() => cambiarCant(g.id, 1)} style={{ width: 30, height: 30, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => cambiarCant(g.id, 1)} style={{ width: 32, height: 32, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontSize: 22, fontWeight: 900, cursor: "pointer" }}>+</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.values(cantSueltas).some(v => v > 0) && (
                  <button onClick={() => agregarSueltas(itemsCat.guarniciones, "guar")} style={{ width: "100%", background: G, border: "none", borderRadius: 14, padding: "15px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer", marginTop: 4 }}>
                    + Agregar al pedido
                  </button>
                )}
              </>
            )}

            {/* BEBIDAS */}
            {catActiva === "bebidas" && (
              <>
                {itemsCat.bebidas.map(b => {
                  const foto = fotosBebida[b.id];
                  const qty = cantSueltas[b.id] || 0;
                  return (
                    <div key={b.id} style={{ background: "#fff", borderRadius: 16, marginBottom: 12, display: "flex", overflow: "hidden", boxShadow: "0 1px 4px #0001", border: qty > 0 ? `2px solid ${G}` : "2px solid transparent" }}>
                      <div style={{ width: 110, height: 100, flexShrink: 0, background: "#f0f4f2" }}>
                        {foto ? <img src={foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🥤</div>}
                      </div>
                      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: GD }}>{b.nombre}</div>
                          <div style={{ fontSize: 12, color: "#999" }}>{b.detalle}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 900, fontSize: 16, color: GD }}>{fmt(b.precio)}</div>
                          {qty > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <button onClick={() => cambiarCant(b.id, -1)} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${G}`, background: "#fff", color: G, fontWeight: 900, fontSize: 18, cursor: "pointer" }}>−</button>
                              <span style={{ fontWeight: 800, color: GD }}>{qty}</span>
                              <button onClick={() => cambiarCant(b.id, 1)} style={{ width: 30, height: 30, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => cambiarCant(b.id, 1)} style={{ width: 32, height: 32, borderRadius: "50%", background: GD, border: "none", color: "#fff", fontSize: 22, fontWeight: 900, cursor: "pointer" }}>+</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.values(cantSueltas).some(v => v > 0) && (
                  <button onClick={() => agregarSueltas(itemsCat.bebidas, "bebida")} style={{ width: "100%", background: G, border: "none", borderRadius: 14, padding: "15px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer", marginTop: 4 }}>
                    + Agregar al pedido
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── BARRA INFERIOR DE PEDIDO ── */}
          {totalItems > 0 && (
            <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: `1px solid ${GBORDER}`, padding: "12px 16px" }}>
              <button onClick={() => setPantalla("checkout")} style={{ width: "100%", background: GD, border: "none", borderRadius: 16, padding: "16px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ background: G, borderRadius: 8, padding: "4px 10px", fontSize: 14 }}>{totalItems} item{totalItems > 1 ? "s" : ""}</span>
                <span>Ver pedido</span>
                <span>{fmt(totalPrecio)}</span>
              </button>
            </div>
          )}

          {/* Espacio para barra inferior */}
          {totalItems > 0 && <div style={{ height: 80 }} />}
        </>
      )}

      {/* Modal burger */}
      {modalBurger && (
        <ModalBurger
          burger={modalBurger}
          fotoUrl={fotosBurger[modalBurger.id]}
          extras={menu.extras}
          guarniciones={menu.guarniciones}
          fotoExtras={fotosExtra}
          fotoGuar={fotosGuar}
          onAgregar={agregar}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
