import { useState, useEffect, useRef } from "react";

const WA_NUMBER = "543417408076";
const LS_ZONA_KEY = "rb-zona-delivery";
const LS_MENU_KEY = "rb-menu-publico";

function loadZona() {
  try { return JSON.parse(localStorage.getItem(LS_ZONA_KEY)) || []; } catch { return []; }
}
function loadMenu() {
  try { return JSON.parse(localStorage.getItem(LS_MENU_KEY)) || { hamburguesas: [], extras: [], bebidas: [] }; } catch { return { hamburguesas: [], extras: [], bebidas: [] }; }
}

function puntoDentroDePoligono(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function geocodificar(direccion) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`, { headers: { "Accept-Language": "es" } });
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ── Mapa ──────────────────────────────────────────────────────────
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
      const map = L.map(ref.current).setView(coords ? [coords.lat, coords.lng] : [-31.42, -64.18], 14);
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

  return <div ref={ref} style={{ height: 220, borderRadius: 10, overflow: "hidden", border: "1px solid #333", marginTop: 10 }} />;
}

// ── Item card ─────────────────────────────────────────────────────
function ItemCard({ item, qty, onChange }) {
  return (
    <div style={{ background: qty > 0 ? "#1f1c0f" : "#1a1a1a", border: `1px solid ${qty > 0 ? "#e8b84b" : "#2a2a2a"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.nombre}</div>
        {item.descripcion && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{item.descripcion}</div>}
      </div>
      {item.precio > 0 && <div style={{ fontWeight: 700, color: "#e8b84b", fontSize: 15, whiteSpace: "nowrap" }}>${item.precio.toLocaleString("es-AR")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {qty > 0 ? (
          <>
            <button onClick={() => onChange(-1)} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #e8b84b", background: "transparent", color: "#e8b84b", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>−</button>
            <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
            <button onClick={() => onChange(1)} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #e8b84b", background: "transparent", color: "#e8b84b", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>+</button>
          </>
        ) : (
          <button onClick={() => onChange(1)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid #e8b84b", background: "transparent", color: "#e8b84b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Agregar</button>
        )}
      </div>
    </div>
  );
}

// ── Principal ─────────────────────────────────────────────────────
export default function PaginaCliente() {
  const [menu] = useState(loadMenu);
  const [zona] = useState(loadZona);
  const [carrito, setCarrito] = useState({});
  const [tipo, setTipo] = useState("delivery");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState(null); // null | buscando | ok | fuera | err
  const [pago, setPago] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const timer = useRef(null);

  const todosItems = [...(menu.hamburguesas || []), ...(menu.extras || []), ...(menu.bebidas || [])];
  const totalItems = Object.values(carrito).reduce((a, b) => a + b, 0);
  const totalPrecio = Object.entries(carrito).reduce((sum, [id, qty]) => {
    const item = todosItems.find(i => String(i.id) === String(id));
    return sum + (item?.precio || 0) * qty;
  }, 0);

  function cambiarQty(id, delta) {
    setCarrito(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  }

  useEffect(() => {
    if (tipo !== "delivery" || direccion.trim().length < 8) { setCoords(null); setGeoStatus(null); return; }
    setGeoStatus("buscando");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const c = await geocodificar(direccion);
        if (!c) { setGeoStatus("err"); setCoords(null); return; }
        setCoords(c);
        if (zona.length > 2) setGeoStatus(puntoDentroDePoligono(c.lat, c.lng, zona) ? "ok" : "fuera");
        else setGeoStatus("ok");
      } catch { setGeoStatus("err"); setCoords(null); }
    }, 1000);
    return () => clearTimeout(timer.current);
  }, [direccion, tipo]);

  const valido = totalItems > 0 && nombre.trim() && pago &&
    (tipo === "retiro" || (direccion.trim() && geoStatus === "ok"));

  function confirmar() {
    if (!valido || enviando) return;
    setEnviando(true);
    const lineas = [`🍔 *NUEVO PEDIDO - Roses Burgers*`, ""];
    lineas.push("📋 *PEDIDO:*");
    for (const [id, qty] of Object.entries(carrito)) {
      const item = todosItems.find(i => String(i.id) === String(id));
      if (item) lineas.push(`• ${qty}x ${item.nombre}${item.precio > 0 ? ` ($${item.precio.toLocaleString("es-AR")})` : ""}`);
    }
    lineas.push("", `👤 *Cliente:* ${nombre}`);
    lineas.push(`📦 *Tipo:* ${tipo === "delivery" ? "🛵 Delivery" : "🏠 Retiro en local"}`);
    if (tipo === "delivery") lineas.push(`📍 *Dirección:* ${direccion}`);
    lineas.push(`💳 *Pago:* ${pago}`);
    if (notas.trim()) lineas.push(`📝 *Notas:* ${notas.trim()}`);
    if (totalPrecio > 0) lineas.push("", `💰 *Total: $${totalPrecio.toLocaleString("es-AR")}*`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lineas.join("\n"))}`, "_blank");
    setTimeout(() => setEnviando(false), 2000);
  }

  const menuVacio = todosItems.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ background: "#1a1a1a", borderBottom: "3px solid #e8b84b", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#e8b84b", letterSpacing: -1 }}>🍔 Roses Burgers</div>
          <div style={{ fontSize: 12, color: "#888" }}>Hacé tu pedido online</div>
        </div>
        {totalItems > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e8b84b", fontWeight: 900, fontSize: 18 }}>{totalItems} item{totalItems > 1 ? "s" : ""}</div>
            {totalPrecio > 0 && <div style={{ color: "#888", fontSize: 12 }}>${totalPrecio.toLocaleString("es-AR")}</div>}
          </div>
        )}
      </div>

      {menuVacio ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#555" }}>
          <div style={{ fontSize: 48 }}>🍔</div>
          <div style={{ fontSize: 16, marginTop: 16 }}>El menú se está preparando, volvé pronto.</div>
        </div>
      ) : (
        <>
          {/* Secciones del menú */}
          {[
            { key: "hamburguesas", label: "Hamburguesas", icon: "🍔" },
            { key: "extras",       label: "Extras y guarniciones", icon: "🍟" },
            { key: "bebidas",      label: "Bebidas", icon: "🥤" },
          ].map(sec => {
            const items = (menu[sec.key] || []).filter(i => i.disponible);
            if (!items.length) return null;
            return (
              <div key={sec.key} style={{ padding: "20px 16px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, borderBottom: "1px solid #2a2a2a", paddingBottom: 6 }}>
                  {sec.icon} {sec.label}
                </div>
                {items.map(item => <ItemCard key={item.id} item={item} qty={carrito[item.id] || 0} onChange={d => cambiarQty(item.id, d)} />)}
              </div>
            );
          })}

          {/* Datos del pedido */}
          {totalItems > 0 && (
            <div style={{ padding: "24px 16px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8b84b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, borderBottom: "1px solid #2a2a2a", paddingBottom: 6 }}>
                📋 Datos del pedido
              </div>

              {/* Nombre */}
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Tu nombre *</label>
              <input style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 16 }}
                placeholder="Ej: Juan García" value={nombre} onChange={e => setNombre(e.target.value)} />

              {/* Tipo */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["delivery", "🛵 Delivery"], ["retiro", "🏠 Retiro en local"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setTipo(val)} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${tipo === val ? "#e8b84b" : "#333"}`, background: tipo === val ? "#1f1c0f" : "#1a1a1a", color: tipo === val ? "#e8b84b" : "#888", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Dirección + mapa */}
              {tipo === "delivery" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Dirección de entrega *</label>
                  <input style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none" }}
                    placeholder="Ej: Av. Corrientes 1234, Corrientes" value={direccion} onChange={e => setDireccion(e.target.value)} />
                  {geoStatus === "buscando" && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#2e2200", border: "1px solid #7a5a00", color: "#e4c96a", fontSize: 13 }}>🔍 Buscando dirección...</div>}
                  {geoStatus === "ok"      && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#0f2e1a", border: "1px solid #1a7a3a", color: "#6ee49a", fontSize: 13 }}>✅ Dirección dentro de nuestra zona de delivery</div>}
                  {geoStatus === "fuera"   && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#2e0f0f", border: "1px solid #7a1a1a", color: "#e49a9a", fontSize: 13 }}>❌ Lo sentimos, tu dirección está fuera de nuestra zona de delivery</div>}
                  {geoStatus === "err"     && <div style={{ marginTop: 8, padding: "9px 14px", borderRadius: 8, background: "#2e0f0f", border: "1px solid #7a1a1a", color: "#e49a9a", fontSize: 13 }}>⚠️ No encontramos esa dirección. Intentá ser más específico.</div>}
                  {(coords || zona.length > 2) && <MapaCliente coords={coords} zona={zona} />}
                </div>
              )}

              {/* Pago */}
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Método de pago *</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {["Efectivo", "Transferencia", "Link de pago"].map(op => (
                  <button key={op} onClick={() => setPago(op)} style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: `1px solid ${pago === op ? "#e8b84b" : "#333"}`, background: pago === op ? "#1f1c0f" : "#1a1a1a", color: pago === op ? "#e8b84b" : "#888", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    {op}
                  </button>
                ))}
              </div>

              {/* Notas */}
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Notas o aclaraciones (opcional)</label>
              <textarea style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 70 }}
                placeholder="Sin cebolla, extra picante..." value={notas} onChange={e => setNotas(e.target.value)} />
            </div>
          )}
        </>
      )}

      {/* Botón WhatsApp */}
      <button
        onClick={confirmar}
        disabled={!valido || enviando}
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: valido && !enviando ? "#25d366" : "#2a2a2a", border: "none", padding: "18px 20px", cursor: valido ? "pointer" : "not-allowed", fontWeight: 900, fontSize: 16, color: valido && !enviando ? "#fff" : "#555", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 200 }}
      >
        {totalItems === 0 ? "Seleccioná al menos un producto"
          : !valido ? "Completá todos los datos"
          : enviando ? "Abriendo WhatsApp..."
          : `📲 Confirmar pedido por WhatsApp${totalPrecio > 0 ? ` · $${totalPrecio.toLocaleString("es-AR")}` : ""}`}
      </button>
    </div>
  );
}
