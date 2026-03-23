import { useState, useEffect, useRef } from "react";
import {
  loadBurgers, loadGuarniciones, loadExtras, loadBebidas,
  loadFoto, loadZona, fmt,
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
  return <div ref={ref} style={{ height: 200, borderRadius: 10, overflow: "hidden", border: "1px solid #c8e6d0", marginTop: 10 }} />;
}

// ── Colores / Design tokens ───────────────────────────────────────
const C = {
  bg:        "#ffffff",
  bgSoft:    "#f4f9f6",
  border:    "#d0e8d8",
  green:     "#1a7a3a",
  greenDark: "#1a3a25",
  greenLight:"#e8f5ec",
  text:      "#1a1a1a",
  textSoft:  "#666",
  accent:    "#1a7a3a",
};

// ── Componentes UI ────────────────────────────────────────────────
function SecTitle({ icon, label }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 7 }}>
      {icon} {label}
    </div>
  );
}

function BtnRound({ onClick, children }) {
  return <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${C.green}`, background: "#fff", color: C.green, fontWeight: 900, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>;
}

// ── Modal de personalización ──────────────────────────────────────
function ModalBurger({ burger, extras, guarniciones, onAgregar, onCerrar }) {
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
  const extrasTotal = extrasEleg.reduce((s, id) => s + (extras.find(e => e.id === id)?.precio || 0), 0);
  const total = tObj.precio + (gObj?.precio || 0) + extrasTotal;

  function toggleExtra(id) {
    setExtrasEleg(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function agregar() {
    onAgregar({
      cartId: Date.now() + Math.random(),
      tipo: "burger",
      nombre: burger.nombre,
      tamano: tObj.label,
      guarnicion: gObj ? { nombre: `${gObj.nombre} (${gObj.detalle})`, precio: gObj.precio } : null,
      extras: extrasEleg.map(id => extras.find(e => e.id === id)).filter(Boolean),
      precio: total,
    });
    onCerrar();
  }

  const foto = loadFoto("burger", burger.id);
  const tagColor = burger.tag === "NUEVA" ? "#1a5c2a" : "#8b2e10";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onCerrar}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Foto */}
        {foto && <img src={foto} alt={burger.nombre} style={{ width: "100%", height: 200, objectFit: "cover" }} />}

        <div style={{ padding: "20px 20px 32px" }}>
          {/* Nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.greenDark, letterSpacing: 0.5 }}>{burger.nombre}</div>
            {burger.tag && <span style={{ background: tagColor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>{burger.tag}</span>}
          </div>
          <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 20 }}>{burger.desc}</div>

          {/* Tamaño */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 1.5, marginBottom: 10 }}>TAMAÑO</div>
            <div style={{ display: "flex", gap: 8 }}>
              {tamanos.map(t => (
                <button key={t.key} onClick={() => setTamano(t.key)} style={{ flex: 1, padding: "12px 6px", borderRadius: 10, border: `2px solid ${tamano === t.key ? C.green : C.border}`, background: tamano === t.key ? C.greenLight : "#fff", color: tamano === t.key ? C.greenDark : C.textSoft, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 12, marginTop: 2, fontWeight: 700 }}>{fmt(t.precio)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Guarnición */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 1.5, marginBottom: 10 }}>GUARNICIÓN <span style={{ color: "#aaa", fontWeight: 400 }}>(opcional)</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => setGuarnicion(null)} style={{ padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${guarnicion === null ? C.green : C.border}`, background: guarnicion === null ? C.greenLight : "#fff", color: guarnicion === null ? C.greenDark : C.textSoft, cursor: "pointer", textAlign: "left", fontWeight: 600, fontSize: 13 }}>
                Sin guarnición
              </button>
              {guarniciones.filter(g => g.disponible).map(g => {
                const fotoG = loadFoto("guar", g.id);
                const sel = guarnicion === g.id;
                return (
                  <button key={g.id} onClick={() => setGuarnicion(g.id)} style={{ padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLight : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    {fotoG && <img src={fotoG} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                    <span style={{ flex: 1, textAlign: "left", fontWeight: 600, fontSize: 13, color: sel ? C.greenDark : C.text }}>{g.nombre} <span style={{ fontWeight: 400, color: C.textSoft, fontSize: 12 }}>({g.detalle})</span></span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: sel ? C.green : C.textSoft }}>+{fmt(g.precio)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          {extras.filter(e => e.disponible).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: 1.5, marginBottom: 10 }}>EXTRAS <span style={{ color: "#aaa", fontWeight: 400 }}>(podés elegir varios)</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {extras.filter(e => e.disponible).map(e => {
                  const sel = extrasEleg.includes(e.id);
                  const fotoE = loadFoto("extra", e.id);
                  return (
                    <button key={e.id} onClick={() => toggleExtra(e.id)} style={{ padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${sel ? C.green : C.border}`, background: sel ? C.greenLight : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      {fotoE && <img src={fotoE} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                      <span style={{ flex: 1, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? C.green : C.border}`, background: sel ? C.green : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 }}>{sel ? "✓" : ""}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: sel ? C.greenDark : C.text }}>{e.nombre}</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: sel ? C.green : C.textSoft }}>+{fmt(e.precio)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total + botón */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: C.textSoft }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.greenDark }}>{fmt(total)}</div>
            </div>
            <button onClick={agregar} style={{ background: C.green, border: "none", borderRadius: 12, padding: "14px 28px", fontWeight: 900, fontSize: 16, color: "#fff", cursor: "pointer" }}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Item con contador (guarniciones/bebidas sueltas) ──────────────
function ItemConContador({ item, tipoFoto, qty, onChange }) {
  const foto = loadFoto(tipoFoto, item.id);
  return (
    <div style={{ background: qty > 0 ? C.greenLight : "#fff", border: `1.5px solid ${qty > 0 ? C.green : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
      {foto && <img src={foto} alt={item.nombre} style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{item.nombre}</div>
        {item.detalle && <div style={{ fontSize: 12, color: C.textSoft }}>{item.detalle}</div>}
      </div>
      <div style={{ fontWeight: 700, color: C.green, fontSize: 14, whiteSpace: "nowrap" }}>{fmt(item.precio)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {qty > 0 ? (
          <>
            <BtnRound onClick={() => onChange(-1)}>−</BtnRound>
            <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center", color: C.text }}>{qty}</span>
            <BtnRound onClick={() => onChange(1)}>+</BtnRound>
          </>
        ) : (
          <button onClick={() => onChange(1)} style={{ padding: "6px 16px", borderRadius: 20, border: `1.5px solid ${C.green}`, background: "#fff", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Agregar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sección con contador (guarniciones o bebidas) ─────────────────
function SeccionConContador({ items, tipoFoto, onAgregar }) {
  const [cantidades, setCantidades] = useState({});
  function cambiar(id, delta) { setCantidades(p => { const n = Math.max(0, (p[id] || 0) + delta); return { ...p, [id]: n }; }); }
  function confirmar() {
    for (const [id, qty] of Object.entries(cantidades)) {
      if (qty > 0) {
        const it = items.find(x => x.id === id);
        for (let i = 0; i < qty; i++) onAgregar({ cartId: Date.now() + Math.random(), tipo: tipoFoto, nombre: it.nombre + (it.detalle ? ` (${it.detalle})` : ""), precio: it.precio });
      }
    }
    setCantidades({});
  }
  const hay = Object.values(cantidades).some(v => v > 0);
  return (
    <>
      {items.filter(i => i.disponible).map(it => <ItemConContador key={it.id} item={it} tipoFoto={tipoFoto} qty={cantidades[it.id] || 0} onChange={d => cambiar(it.id, d)} />)}
      {hay && <button onClick={confirmar} style={{ width: "100%", background: C.greenLight, border: `1.5px solid ${C.green}`, borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 14, color: C.green, cursor: "pointer", marginTop: 4 }}>+ Agregar al pedido</button>}
    </>
  );
}

// ── Alerta ────────────────────────────────────────────────────────
function Alerta({ tipo, children }) {
  const estilos = {
    ok:   { background: "#e8f5ec", border: `1px solid ${C.green}`, color: C.greenDark },
    err:  { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" },
    warn: { background: "#fffbe6", border: "1px solid #f0d060", color: "#7a5a00" },
  };
  return <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, fontSize: 13, ...estilos[tipo] }}>{children}</div>;
}

// ── Página principal ──────────────────────────────────────────────
export default function PaginaCliente() {
  const [burgers]      = useState(loadBurgers);
  const [guarniciones] = useState(loadGuarniciones);
  const [extras]       = useState(loadExtras);
  const [bebidas]      = useState(loadBebidas);
  const [zona]         = useState(loadZona);

  const [modalBurger, setModalBurger] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [tipo, setTipo]       = useState("delivery");
  const [nombre, setNombre]   = useState("");
  const [direccion, setDir]   = useState("");
  const [coords, setCoords]   = useState(null);
  const [geoStatus, setGeo]   = useState(null);
  const [pago, setPago]       = useState("");
  const [notas, setNotas]     = useState("");
  const [enviando, setEnv]    = useState(false);
  const timer = useRef(null);

  const totalItems  = carrito.length;
  const totalPrecio = carrito.reduce((s, i) => s + i.precio, 0);

  function agregar(item) { setCarrito(p => [...p, item]); }
  function quitar(cartId) { setCarrito(p => p.filter(i => i.cartId !== cartId)); }

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

  const valido = totalItems > 0 && nombre.trim() && pago &&
    (tipo === "retiro" || (direccion.trim() && geoStatus === "ok"));

  function confirmar() {
    if (!valido || enviando) return;
    setEnv(true);
    const lineas = ["🍔 *NUEVO PEDIDO - Roses Burgers*", ""];
    lineas.push("📋 *DETALLE:*");
    carrito.forEach(item => {
      if (item.tipo === "burger") {
        lineas.push(`• 🍔 ${item.nombre} (${item.tamano}) — ${fmt(item.precio)}`);
        if (item.guarnicion) lineas.push(`   ↳ + ${item.guarnicion.nombre}`);
        if (item.extras?.length) lineas.push(`   ↳ Extras: ${item.extras.map(e => e.nombre).join(", ")}`);
      } else {
        const ic = item.tipo === "guar" ? "🍟" : "🥤";
        lineas.push(`• ${ic} ${item.nombre} — ${fmt(item.precio)}`);
      }
    });
    lineas.push("", `👤 *Cliente:* ${nombre}`);
    lineas.push(`📦 *Tipo:* ${tipo === "delivery" ? "🛵 Delivery" : "🏠 Retiro en local"}`);
    if (tipo === "delivery") lineas.push(`📍 *Dirección:* ${direccion}`);
    lineas.push(`💳 *Pago:* ${pago}`);
    if (notas.trim()) lineas.push(`📝 *Notas:* ${notas.trim()}`);
    lineas.push("", `💰 *TOTAL: ${fmt(totalPrecio)}*`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
    setTimeout(() => setEnv(false), 2000);
  }

  const inputStyle = { width: "100%", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Segoe UI', sans-serif", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: C.greenDark, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px #0002" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>🍔 Roses Burgers</div>
          <div style={{ fontSize: 11, color: "#a8d5b5" }}>Hacé tu pedido online</div>
        </div>
        {totalItems > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#a8d5b5", fontWeight: 900, fontSize: 17 }}>{totalItems} item{totalItems > 1 ? "s" : ""}</div>
            <div style={{ color: "#6ab88a", fontSize: 12 }}>{fmt(totalPrecio)}</div>
          </div>
        )}
      </div>

      {/* Hamburguesas */}
      <div style={{ padding: "20px 16px 0" }}>
        <SecTitle icon="🍔" label="Hamburguesas" />
        {burgers.filter(b => b.disponible).map(b => {
          const foto = loadFoto("burger", b.id);
          const enCarrito = carrito.filter(i => i.tipo === "burger" && i.nombre === b.nombre).length;
          const tagColor = b.tag === "NUEVA" ? "#1a5c2a" : "#8b2e10";
          return (
            <div key={b.id} onClick={() => setModalBurger(b)} style={{ background: enCarrito > 0 ? C.greenLight : "#fff", border: `1.5px solid ${enCarrito > 0 ? C.green : C.border}`, borderRadius: 12, marginBottom: 10, cursor: "pointer", overflow: "hidden", display: "flex", transition: "border-color 0.15s" }}>
              {foto && <img src={foto} alt={b.nombre} style={{ width: 90, height: 90, objectFit: "cover", flexShrink: 0 }} />}
              <div style={{ padding: "12px 14px", flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 900, fontSize: 14, color: C.greenDark, letterSpacing: 0.5 }}>{b.nombre}</span>
                    {b.tag && <span style={{ background: tagColor, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>{b.tag}</span>}
                    {enCarrito > 0 && <span style={{ background: C.green, color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 10 }}>×{enCarrito}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSoft, lineHeight: 1.4 }}>{b.desc}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: C.textSoft }}>desde</div>
                  <div style={{ fontWeight: 700, color: C.green, fontSize: 14 }}>{fmt(b.simple)}</div>
                  <div style={{ color: C.green, fontSize: 18, marginTop: 2 }}>›</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guarniciones */}
      <div style={{ padding: "20px 16px 0" }}>
        <SecTitle icon="🍟" label="Guarniciones" />
        <SeccionConContador items={guarniciones} tipoFoto="guar" onAgregar={agregar} />
      </div>

      {/* Bebidas */}
      <div style={{ padding: "20px 16px 0" }}>
        <SecTitle icon="🥤" label="Bebidas" />
        <SeccionConContador items={bebidas} tipoFoto="bebida" onAgregar={agregar} />
      </div>

      {/* Carrito */}
      {carrito.length > 0 && (
        <div style={{ padding: "24px 16px 0" }}>
          <SecTitle icon="🛒" label="Tu pedido" />
          {carrito.map(item => (
            <div key={item.cartId} style={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.greenDark }}>
                  {item.tipo === "burger" ? "🍔" : item.tipo === "guar" ? "🍟" : "🥤"} {item.nombre}
                  {item.tamano && <span style={{ fontWeight: 400, color: C.textSoft, fontSize: 12 }}> · {item.tamano}</span>}
                </div>
                {item.guarnicion && <div style={{ fontSize: 12, color: C.textSoft }}>+ {item.guarnicion.nombre}</div>}
                {item.extras?.map(e => <div key={e.id} style={{ fontSize: 12, color: C.textSoft }}>+ {e.nombre}</div>)}
              </div>
              <div style={{ fontWeight: 700, color: C.green, whiteSpace: "nowrap" }}>{fmt(item.precio)}</div>
              <button onClick={() => quitar(item.cartId)} style={{ background: "transparent", border: "none", color: "#ccc", fontSize: 16, cursor: "pointer", padding: "0 2px" }}>✕</button>
            </div>
          ))}
          <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
            <span style={{ color: C.textSoft, fontSize: 14 }}>Total:</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: C.greenDark }}>{fmt(totalPrecio)}</span>
          </div>
        </div>
      )}

      {/* Datos del pedido */}
      {totalItems > 0 && (
        <div style={{ padding: "24px 16px 0" }}>
          <SecTitle icon="📋" label="Datos del pedido" />

          <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 6 }}>Tu nombre *</label>
          <input style={{ ...inputStyle, marginBottom: 16 }} placeholder="Ej: Juan García" value={nombre} onChange={e => setNombre(e.target.value)} />

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro en local"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setTipo(val)} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1.5px solid ${tipo === val ? C.green : C.border}`, background: tipo === val ? C.greenLight : "#fff", color: tipo === val ? C.greenDark : C.textSoft, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {lbl}
              </button>
            ))}
          </div>

          {tipo === "delivery" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 6 }}>Dirección de entrega *</label>
              <input style={inputStyle} placeholder="Ej: Av. Corrientes 1234, Corrientes" value={direccion} onChange={e => setDir(e.target.value)} />
              {geoStatus === "buscando" && <Alerta tipo="warn">🔍 Buscando dirección...</Alerta>}
              {geoStatus === "ok"      && <Alerta tipo="ok">✅ Dirección dentro de nuestra zona de delivery</Alerta>}
              {geoStatus === "fuera"   && <Alerta tipo="err">❌ Lo sentimos, tu dirección está fuera de nuestra zona de delivery</Alerta>}
              {geoStatus === "err"     && <Alerta tipo="err">⚠️ No encontramos esa dirección. Intentá ser más específico.</Alerta>}
              {(coords || zona.length > 2) && <MapaCliente coords={coords} zona={zona} />}
            </div>
          )}

          <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 6 }}>Método de pago *</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["Efectivo", "Transferencia", "Link de pago"].map(op => (
              <button key={op} onClick={() => setPago(op)} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1.5px solid ${pago === op ? C.green : C.border}`, background: pago === op ? C.greenLight : "#fff", color: pago === op ? C.greenDark : C.textSoft, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {op}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 6 }}>Notas (opcional)</label>
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} placeholder="Sin cebolla, extra picante..." value={notas} onChange={e => setNotas(e.target.value)} />
        </div>
      )}

      {/* Botón WhatsApp */}
      <button onClick={confirmar} disabled={!valido || enviando} style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: valido && !enviando ? "#25d366" : "#e0e0e0", border: "none", padding: "18px 20px", cursor: valido ? "pointer" : "not-allowed", fontWeight: 900, fontSize: 15, color: valido && !enviando ? "#fff" : "#aaa", zIndex: 200, boxShadow: "0 -2px 10px #0001" }}>
        {totalItems === 0
          ? "Seleccioná tu hamburguesa para empezar"
          : !valido
          ? "Completá todos los datos para confirmar"
          : enviando
          ? "Abriendo WhatsApp..."
          : `📲 Confirmar por WhatsApp · ${fmt(totalPrecio)}`}
      </button>

      {modalBurger && <ModalBurger burger={modalBurger} extras={extras} guarniciones={guarniciones} onAgregar={agregar} onCerrar={() => setModalBurger(null)} />}
    </div>
  );
}
