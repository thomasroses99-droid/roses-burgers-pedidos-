import { useState, useEffect, useRef } from "react";

const WA_NUMBER = "543417408076";
const LS_ZONA_KEY = "rb-zona-delivery";

function loadZona() {
  try { return JSON.parse(localStorage.getItem(LS_ZONA_KEY)) || []; } catch { return []; }
}

// ── Datos del menú ────────────────────────────────────────────────
const BURGERS = [
  { id: 1,  nombre: "CHEESEBURGER",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, aderezo a base de mayonesa." },
  { id: 2,  nombre: "ROSES",         tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, ketchup, mayonesa, cebolla brunoise." },
  { id: 3,  nombre: "1967",          tag: null,        desc: "Pan brioche, doble cheddar, medallón 100gr, lechuga, cebolla, pepino, aderezo a base de mayonesa." },
  { id: 4,  nombre: "CLASSIC",       tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, lechuga, tomate, cebolla, pepino, salsa mil islas." },
  { id: 5,  nombre: "CHEESE ONION",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón smashed 100gr, cebolla, aderezo a base de mayonesa." },
  { id: 6,  nombre: "COWBOY",        tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, cowboy butter." },
  { id: 7,  nombre: "SMOKEY BACON",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, cebolla crispy, barbacoa." },
  { id: 8,  nombre: "BLUE CHEESE",   tag: "RENOVADA", desc: "Pan brioche, roquefort, medallón 100gr, rúcula, panceta, cebolla caramelizada, honey mustard." },
  { id: 9,  nombre: "STACKED ONION", tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, aros de cebolla, stacked sauce." },
  { id: 10, nombre: "CHEESE BACON",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, bacon sauce." },
  { id: 11, nombre: "BIGGIE BURGER", tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, lechuga, cebolla morada, pepino, tasty sauce." },
  { id: 12, nombre: "CRISPY GARLIC", tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, cebolla crispy, alioli." },
  { id: 13, nombre: "RUBY CLOVE",    tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, cebolla morada brunoise, alioli." },
];

const TAMANOS = [
  { key: "simple", label: "Simple",  precio: 11000 },
  { key: "doble",  label: "Doble",   precio: 13000 },
  { key: "triple", label: "Triple",  precio: 15000 },
];

const GUARNICIONES = [
  { id: "g1", nombre: "Papas Fritas",    detalle: "Chicas",          precio: 3500  },
  { id: "g2", nombre: "Papas Cheddar",   detalle: "Grandes",         precio: 8000  },
  { id: "g3", nombre: "Aros de Cebolla", detalle: "Grandes · 18 u.", precio: 10000 },
  { id: "g4", nombre: "Aros de Cebolla", detalle: "Chicas · 9 u.",   precio: 5500  },
  { id: "g5", nombre: "Nuggets",         detalle: "10 u.",           precio: 6500  },
  { id: "g6", nombre: "Nuggets G",       detalle: "Grandes · 20 u.", precio: 12000 },
];

const EXTRAS_BURGER = [
  { id: "e1", nombre: "Medallón + Queso Extra", precio: 2500 },
  { id: "e2", nombre: "Panceta",                precio: 1500 },
  { id: "e3", nombre: "Cheddar",                precio: 1000 },
  { id: "e4", nombre: "Pepino",                 precio: 500  },
  { id: "e5", nombre: "Cebolla",                precio: 200  },
];

const BEBIDAS = [
  { id: "b1", nombre: "Gaseosa", detalle: "Pepsi / Pepsi Black / 7UP / Mirinda 354cc", precio: 3000 },
];

// ── Geocodificación y mapa ────────────────────────────────────────
function puntoDentroDePoligono(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function geocodificar(dir) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dir)}&limit=1`, { headers: { "Accept-Language": "es" } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function MapaCliente({ coords, zona }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
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
      const map = L.map(ref.current).setView(coords ? [coords.lat, coords.lng] : [-27.47, -58.83], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      if (zona?.length > 2) L.polygon(zona, { color: "#e8b84b", fillColor: "#e8b84b", fillOpacity: 0.12, weight: 2 }).addTo(map);
      if (coords) {
        const icon = L.divIcon({ html: '<div style="background:#e8b84b;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0009"></div>', className: "", iconAnchor: [7, 7] });
        markerRef.current = L.marker([coords.lat, coords.lng], { icon }).addTo(map);
      }
      mapRef.current = map;
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    import("leaflet").then(Lmod => {
      const L = Lmod.default || Lmod;
      if (markerRef.current) markerRef.current.remove();
      const icon = L.divIcon({ html: '<div style="background:#e8b84b;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #0009"></div>', className: "", iconAnchor: [7, 7] });
      markerRef.current = L.marker([coords.lat, coords.lng], { icon }).addTo(mapRef.current);
      mapRef.current.setView([coords.lat, coords.lng], 15);
    });
  }, [coords]);
  return <div ref={ref} style={{ height: 200, borderRadius: 10, overflow: "hidden", border: "1px solid #333", marginTop: 10 }} />;
}

// ── Helpers ───────────────────────────────────────────────────────
const fmt = n => `$${n.toLocaleString("es-AR")}`;

// ── Modal de personalización de burger ───────────────────────────
function ModalBurger({ burger, onAgregar, onCerrar }) {
  const [tamano, setTamano] = useState("simple");
  const [guarnicion, setGuarnicion] = useState(null);
  const [extras, setExtras] = useState([]);

  const tamanoObj = TAMANOS.find(t => t.key === tamano);
  const guarnicionObj = GUARNICIONES.find(g => g.id === guarnicion);
  const extrasTotal = extras.reduce((s, id) => s + (EXTRAS_BURGER.find(e => e.id === id)?.precio || 0), 0);
  const total = tamanoObj.precio + (guarnicionObj?.precio || 0) + extrasTotal;

  function toggleExtra(id) {
    setExtras(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  }

  function agregar() {
    onAgregar({
      cartId: Date.now() + Math.random(),
      tipo: "burger",
      nombre: burger.nombre,
      tamano: tamanoObj.label,
      guarnicion: guarnicionObj ? { nombre: `${guarnicionObj.nombre} (${guarnicionObj.detalle})`, precio: guarnicionObj.precio } : null,
      extras: extras.map(id => EXTRAS_BURGER.find(e => e.id === id)).filter(Boolean),
      precio: total,
    });
    onCerrar();
  }

  const tagColor = burger.tag === "NUEVA" ? "#1a5c2a" : "#8b2e10";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onCerrar}>
      <div style={{ background: "#1a1a1a", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 32px" }} onClick={e => e.stopPropagation()}>
        {/* Nombre */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#f0f0f0", letterSpacing: 1 }}>{burger.nombre}</div>
          {burger.tag && <span style={{ background: tagColor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{burger.tag}</span>}
        </div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{burger.desc}</div>

        {/* Tamaño */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>TAMAÑO</div>
          <div style={{ display: "flex", gap: 8 }}>
            {TAMANOS.map(t => (
              <button key={t.key} onClick={() => setTamano(t.key)} style={{ flex: 1, padding: "12px 6px", borderRadius: 10, border: `2px solid ${tamano === t.key ? "#e8b84b" : "#333"}`, background: tamano === t.key ? "#1f1c0f" : "#111", color: tamano === t.key ? "#e8b84b" : "#888", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>{t.label}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>{fmt(t.precio)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Guarnición */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>GUARNICIÓN <span style={{ color: "#555", fontWeight: 400 }}>(opcional)</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => setGuarnicion(null)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${guarnicion === null ? "#e8b84b" : "#2a2a2a"}`, background: guarnicion === null ? "#1f1c0f" : "#111", color: guarnicion === null ? "#e8b84b" : "#666", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600 }}>
              Sin guarnición
            </button>
            {GUARNICIONES.map(g => (
              <button key={g.id} onClick={() => setGuarnicion(g.id)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${guarnicion === g.id ? "#e8b84b" : "#2a2a2a"}`, background: guarnicion === g.id ? "#1f1c0f" : "#111", color: guarnicion === g.id ? "#e8b84b" : "#aaa", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{g.nombre} <span style={{ fontWeight: 400, fontSize: 12, color: "#666" }}>({g.detalle})</span></span>
                <span style={{ fontSize: 13, fontWeight: 700, color: guarnicion === g.id ? "#e8b84b" : "#888" }}>+{fmt(g.precio)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Extras */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#e8b84b", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>EXTRAS <span style={{ color: "#555", fontWeight: 400 }}>(opcional, podés elegir varios)</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {EXTRAS_BURGER.map(e => {
              const sel = extras.includes(e.id);
              return (
                <button key={e.id} onClick={() => toggleExtra(e.id)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${sel ? "#e8b84b" : "#2a2a2a"}`, background: sel ? "#1f1c0f" : "#111", color: sel ? "#e8b84b" : "#aaa", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? "#e8b84b" : "#444"}`, background: sel ? "#e8b84b" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000", flexShrink: 0 }}>{sel ? "✓" : ""}</span>
                    {e.nombre}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: sel ? "#e8b84b" : "#888" }}>+{fmt(e.precio)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Total + botón */}
        <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>Total</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b" }}>{fmt(total)}</div>
          </div>
          <button onClick={agregar} style={{ background: "#e8b84b", border: "none", borderRadius: 12, padding: "14px 28px", fontWeight: 900, fontSize: 16, color: "#000", cursor: "pointer" }}>
            Agregar al pedido
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sección de guarniciones standalone ───────────────────────────
function GuarnicionesSection({ onAgregar }) {
  const [cantidades, setCantidades] = useState({});
  function cambiar(id, delta) {
    setCantidades(prev => { const n = Math.max(0, (prev[id] || 0) + delta); return { ...prev, [id]: n }; });
  }
  function agregarSeleccionados() {
    for (const [id, qty] of Object.entries(cantidades)) {
      if (qty > 0) {
        const g = GUARNICIONES.find(x => x.id === id);
        for (let i = 0; i < qty; i++) {
          onAgregar({ cartId: Date.now() + Math.random(), tipo: "guarnicion", nombre: `${g.nombre} (${g.detalle})`, precio: g.precio });
        }
      }
    }
    setCantidades({});
  }
  const haySeleccion = Object.values(cantidades).some(v => v > 0);
  return (
    <div style={{ padding: "20px 16px 0" }}>
      <SectionTitle icon="🍟" label="Guarniciones" />
      {GUARNICIONES.map(g => {
        const qty = cantidades[g.id] || 0;
        return (
          <div key={g.id} style={{ background: qty > 0 ? "#1f1c0f" : "#1a1a1a", border: `1px solid ${qty > 0 ? "#e8b84b" : "#2a2a2a"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{g.nombre}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{g.detalle}</div>
            </div>
            <div style={{ fontWeight: 700, color: "#e8b84b", fontSize: 14, whiteSpace: "nowrap" }}>{fmt(g.precio)}</div>
            <Counter qty={qty} onChange={d => cambiar(g.id, d)} />
          </div>
        );
      })}
      {haySeleccion && (
        <button onClick={agregarSeleccionados} style={{ width: "100%", background: "#e8b84b22", border: "1px solid #e8b84b", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, color: "#e8b84b", cursor: "pointer", marginTop: 4 }}>
          + Agregar guarniciones al pedido
        </button>
      )}
    </div>
  );
}

// ── Bebidas ───────────────────────────────────────────────────────
function BebidasSection({ onAgregar }) {
  const [cantidades, setCantidades] = useState({});
  function cambiar(id, delta) {
    setCantidades(prev => { const n = Math.max(0, (prev[id] || 0) + delta); return { ...prev, [id]: n }; });
  }
  function agregarSeleccionados() {
    for (const [id, qty] of Object.entries(cantidades)) {
      if (qty > 0) {
        const b = BEBIDAS.find(x => x.id === id);
        for (let i = 0; i < qty; i++) {
          onAgregar({ cartId: Date.now() + Math.random(), tipo: "bebida", nombre: b.nombre, detalle: b.detalle, precio: b.precio });
        }
      }
    }
    setCantidades({});
  }
  const haySeleccion = Object.values(cantidades).some(v => v > 0);
  return (
    <div style={{ padding: "20px 16px 0" }}>
      <SectionTitle icon="🥤" label="Bebidas" />
      {BEBIDAS.map(b => {
        const qty = cantidades[b.id] || 0;
        return (
          <div key={b.id} style={{ background: qty > 0 ? "#1f1c0f" : "#1a1a1a", border: `1px solid ${qty > 0 ? "#e8b84b" : "#2a2a2a"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{b.nombre}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{b.detalle}</div>
            </div>
            <div style={{ fontWeight: 700, color: "#e8b84b", fontSize: 14 }}>{fmt(b.precio)}</div>
            <Counter qty={qty} onChange={d => cambiar(b.id, d)} />
          </div>
        );
      })}
      {haySeleccion && (
        <button onClick={agregarSeleccionados} style={{ width: "100%", background: "#e8b84b22", border: "1px solid #e8b84b", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, color: "#e8b84b", cursor: "pointer", marginTop: 4 }}>
          + Agregar bebidas al pedido
        </button>
      )}
    </div>
  );
}

// ── Pequeños helpers de UI ────────────────────────────────────────
function SectionTitle({ icon, label }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, borderBottom: "1px solid #2a2a2a", paddingBottom: 6 }}>
      {icon} {label}
    </div>
  );
}

function Counter({ qty, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {qty > 0 ? (
        <>
          <Btn onClick={() => onChange(-1)}>−</Btn>
          <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
          <Btn onClick={() => onChange(1)}>+</Btn>
        </>
      ) : (
        <button onClick={() => onChange(1)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid #e8b84b", background: "transparent", color: "#e8b84b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Agregar</button>
      )}
    </div>
  );
}

function Btn({ onClick, children }) {
  return <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #e8b84b", background: "transparent", color: "#e8b84b", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>{children}</button>;
}

// ── Carrito ───────────────────────────────────────────────────────
function Carrito({ items, onEliminar }) {
  if (!items.length) return null;
  return (
    <div style={{ padding: "20px 16px 0" }}>
      <SectionTitle icon="🛒" label="Tu pedido" />
      {items.map(item => (
        <div key={item.cartId} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {item.tipo === "burger" ? `🍔 ${item.nombre}` : item.tipo === "guarnicion" ? `🍟 ${item.nombre}` : `🥤 ${item.nombre}`}
              {item.tamano && <span style={{ fontWeight: 400, color: "#888", fontSize: 12 }}> · {item.tamano}</span>}
            </div>
            {item.guarnicion && <div style={{ fontSize: 12, color: "#888" }}>+ {item.guarnicion.nombre}</div>}
            {item.extras?.map(e => <div key={e.id} style={{ fontSize: 12, color: "#888" }}>+ {e.nombre}</div>)}
            {item.detalle && <div style={{ fontSize: 12, color: "#888" }}>{item.detalle}</div>}
          </div>
          <div style={{ fontWeight: 700, color: "#e8b84b", whiteSpace: "nowrap" }}>{fmt(item.precio)}</div>
          <button onClick={() => onEliminar(item.cartId)} style={{ background: "transparent", border: "none", color: "#555", fontSize: 16, cursor: "pointer", padding: "0 2px" }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function PaginaCliente() {
  const [zona] = useState(loadZona);
  const [modalBurger, setModalBurger] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [tipo, setTipo] = useState("delivery");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState(null);
  const [pago, setPago] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const geoTimer = useRef(null);

  const totalItems = carrito.length;
  const totalPrecio = carrito.reduce((s, i) => s + i.precio, 0);

  function agregarAlCarrito(item) {
    setCarrito(prev => [...prev, item]);
  }
  function eliminarDelCarrito(cartId) {
    setCarrito(prev => prev.filter(i => i.cartId !== cartId));
  }

  // Geocodificación con debounce
  useEffect(() => {
    if (tipo !== "delivery" || direccion.trim().length < 8) { setCoords(null); setGeoStatus(null); return; }
    setGeoStatus("buscando");
    clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      try {
        const c = await geocodificar(direccion);
        if (!c) { setGeoStatus("err"); setCoords(null); return; }
        setCoords(c);
        setGeoStatus(zona.length > 2 ? (puntoDentroDePoligono(c.lat, c.lng, zona) ? "ok" : "fuera") : "ok");
      } catch { setGeoStatus("err"); setCoords(null); }
    }, 1000);
    return () => clearTimeout(geoTimer.current);
  }, [direccion, tipo]);

  const valido = totalItems > 0 && nombre.trim() && pago &&
    (tipo === "retiro" || (direccion.trim() && geoStatus === "ok"));

  function confirmar() {
    if (!valido || enviando) return;
    setEnviando(true);
    const lineas = ["🍔 *NUEVO PEDIDO - Roses Burgers*", ""];
    lineas.push("📋 *DETALLE:*");
    carrito.forEach(item => {
      if (item.tipo === "burger") {
        lineas.push(`• 🍔 ${item.nombre} (${item.tamano}) — ${fmt(item.precio)}`);
        if (item.guarnicion) lineas.push(`   ↳ Guarnición: ${item.guarnicion.nombre}`);
        if (item.extras?.length) lineas.push(`   ↳ Extras: ${item.extras.map(e => e.nombre).join(", ")}`);
      } else if (item.tipo === "guarnicion") {
        lineas.push(`• 🍟 ${item.nombre} — ${fmt(item.precio)}`);
      } else {
        lineas.push(`• 🥤 ${item.nombre} — ${fmt(item.precio)}`);
      }
    });
    lineas.push("", `👤 *Cliente:* ${nombre}`);
    lineas.push(`📦 *Tipo:* ${tipo === "delivery" ? "🛵 Delivery" : "🏠 Retiro en local"}`);
    if (tipo === "delivery") lineas.push(`📍 *Dirección:* ${direccion}`);
    lineas.push(`💳 *Pago:* ${pago}`);
    if (notas.trim()) lineas.push(`📝 *Notas:* ${notas.trim()}`);
    lineas.push("", `💰 *TOTAL: ${fmt(totalPrecio)}*`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
    setTimeout(() => setEnviando(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: "#1a1a1a", borderBottom: "3px solid #e8b84b", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#e8b84b", letterSpacing: -1 }}>🍔 Roses Burgers</div>
          <div style={{ fontSize: 11, color: "#666" }}>Hacé tu pedido online</div>
        </div>
        {totalItems > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e8b84b", fontWeight: 900, fontSize: 17 }}>{totalItems} item{totalItems > 1 ? "s" : ""}</div>
            <div style={{ color: "#888", fontSize: 12 }}>{fmt(totalPrecio)}</div>
          </div>
        )}
      </div>

      {/* Hamburguesas */}
      <div style={{ padding: "20px 16px 0" }}>
        <SectionTitle icon="🍔" label="Hamburguesas" />
        {BURGERS.map(b => {
          const enCarrito = carrito.filter(i => i.tipo === "burger" && i.nombre === b.nombre).length;
          const tagColor = b.tag === "NUEVA" ? "#1a5c2a" : "#8b2e10";
          return (
            <div key={b.id} onClick={() => setModalBurger(b)} style={{ background: enCarrito > 0 ? "#1a1a10" : "#1a1a1a", border: `1px solid ${enCarrito > 0 ? "#e8b84b55" : "#2a2a2a"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.15s" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.5 }}>{b.nombre}</span>
                  {b.tag && <span style={{ background: tagColor, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>{b.tag}</span>}
                  {enCarrito > 0 && <span style={{ background: "#e8b84b", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 10 }}>×{enCarrito}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>{b.desc}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: "#888" }}>desde</div>
                <div style={{ fontWeight: 700, color: "#e8b84b", fontSize: 14 }}>{fmt(11000)}</div>
              </div>
              <div style={{ color: "#e8b84b", fontSize: 18 }}>›</div>
            </div>
          );
        })}
      </div>

      {/* Guarniciones */}
      <GuarnicionesSection onAgregar={agregarAlCarrito} />

      {/* Bebidas */}
      <BebidasSection onAgregar={agregarAlCarrito} />

      {/* Carrito */}
      <Carrito items={carrito} onEliminar={eliminarDelCarrito} />

      {/* Datos del pedido */}
      {totalItems > 0 && (
        <div style={{ padding: "24px 16px 0" }}>
          <SectionTitle icon="📋" label="Datos del pedido" />

          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Tu nombre *</label>
          <input style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 16 }}
            placeholder="Ej: Juan García" value={nombre} onChange={e => setNombre(e.target.value)} />

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro en local"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setTipo(val)} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${tipo === val ? "#e8b84b" : "#333"}`, background: tipo === val ? "#1f1c0f" : "#1a1a1a", color: tipo === val ? "#e8b84b" : "#888", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {lbl}
              </button>
            ))}
          </div>

          {tipo === "delivery" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Dirección de entrega *</label>
              <input style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none" }}
                placeholder="Ej: Av. Corrientes 1234, Corrientes" value={direccion} onChange={e => setDireccion(e.target.value)} />
              {geoStatus === "buscando" && <Alert type="warn">🔍 Buscando dirección...</Alert>}
              {geoStatus === "ok"      && <Alert type="ok">✅ Dirección dentro de nuestra zona de delivery</Alert>}
              {geoStatus === "fuera"   && <Alert type="err">❌ Lo sentimos, tu dirección está fuera de nuestra zona de delivery</Alert>}
              {geoStatus === "err"     && <Alert type="err">⚠️ No encontramos esa dirección. Intentá ser más específico.</Alert>}
              {(coords || zona.length > 2) && <MapaCliente coords={coords} zona={zona} />}
            </div>
          )}

          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Método de pago *</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["Efectivo", "Transferencia", "Link de pago"].map(op => (
              <button key={op} onClick={() => setPago(op)} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${pago === op ? "#e8b84b" : "#333"}`, background: pago === op ? "#1f1c0f" : "#1a1a1a", color: pago === op ? "#e8b84b" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {op}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Notas (opcional)</label>
          <textarea style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 70 }}
            placeholder="Sin cebolla, extra picante..." value={notas} onChange={e => setNotas(e.target.value)} />
        </div>
      )}

      {/* Botón WhatsApp fijo */}
      <button onClick={confirmar} disabled={!valido || enviando} style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: valido && !enviando ? "#25d366" : "#1a1a1a", border: "none", padding: "18px 20px", cursor: valido ? "pointer" : "not-allowed", fontWeight: 900, fontSize: 15, color: valido && !enviando ? "#fff" : "#444", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 200 }}>
        {totalItems === 0 ? "Seleccioná tu hamburguesa para empezar"
          : !valido ? "Completá todos los datos para confirmar"
          : enviando ? "Abriendo WhatsApp..."
          : `📲 Confirmar pedido por WhatsApp · ${fmt(totalPrecio)}`}
      </button>

      {/* Modal burger */}
      {modalBurger && <ModalBurger burger={modalBurger} onAgregar={agregarAlCarrito} onCerrar={() => setModalBurger(null)} />}
    </div>
  );
}

function Alert({ type, children }) {
  const styles = {
    ok:   { background: "#0f2e1a", border: "1px solid #1a7a3a", color: "#6ee49a" },
    err:  { background: "#2e0f0f", border: "1px solid #7a1a1a", color: "#e49a9a" },
    warn: { background: "#2e2200", border: "1px solid #7a5a00", color: "#e4c96a" },
  };
  return <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, fontSize: 13, ...styles[type] }}>{children}</div>;
}
