import { useState, useRef, useEffect } from "react";
import {
  BURGERS_DEFAULT, GUARNICIONES_DEFAULT, EXTRAS_DEFAULT, BEBIDAS_DEFAULT,
  subscribeMenu, saveMenuFirestore,
  uploadFoto, deleteFotoStorage, getFotoURL, getFotoCached, setFotoCache, clearFotoCache,
  saveZonaFirestore, subscribeZona,
  comprimirImagen, fmt,
} from "./datos.js";

const ADMIN_PASS = "RosesBurgers2025";
const LS_SESSION = "rb-admin-session";

// ── Estilos ────────────────────────────────────────────────────────
const G = {
  page:  { minHeight: "100vh", background: "#f4f7f5", fontFamily: "'Segoe UI', sans-serif" },
  header:{ background: "#1a3a25", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: 900, color: "#a8e6bc" },
  card:  { background: "#fff", border: "1px solid #d0e8d8", borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
  input: { border: "1px solid #ccc", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" },
  btn:   (bg = "#1a7a3a", txt = "#fff") => ({ background: bg, color: txt, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }),
  tab:   (a) => ({ padding: "9px 18px", borderRadius: 8, border: "1px solid", borderColor: a ? "#1a7a3a" : "#ccc", background: a ? "#1a7a3a" : "#fff", color: a ? "#fff" : "#555", fontWeight: 700, fontSize: 13, cursor: "pointer" }),
};

// ── Login ──────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pass, setPass] = useState("");
  const [err, setErr]   = useState(false);
  function intentar() {
    if (pass === ADMIN_PASS) { localStorage.setItem(LS_SESSION, "1"); onLogin(); }
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a3a25" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 340, textAlign: "center", boxShadow: "0 8px 40px #0004" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🍔</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#1a3a25", marginBottom: 4 }}>Roses Burgers</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 28 }}>Panel de administración</div>
        <input type="password" style={{ ...G.input, width: "100%", textAlign: "center", fontSize: 15, padding: "12px", marginBottom: 12 }}
          placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && intentar()} autoFocus />
        {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>Contraseña incorrecta</div>}
        <button onClick={intentar} style={{ ...G.btn(), width: "100%", padding: "12px", fontSize: 15 }}>Entrar</button>
      </div>
    </div>
  );
}

// ── Upload de foto con Firebase Storage ───────────────────────────
function FotoUpload({ tipo, id }) {
  const [url, setUrl]       = useState(() => getFotoCached(tipo, id));
  const [cargando, setCarg] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (url) return;
    getFotoURL(tipo, id).then(u => { if (u) { setFotoCache(tipo, id, u); setUrl(u); } });
  }, []);

  async function onFile(e) {
    const file = e.target.files[0]; if (!file) return;
    setCarg(true);
    try {
      const b64 = await comprimirImagen(file);
      const newUrl = await uploadFoto(tipo, id, b64);
      setFotoCache(tipo, id, newUrl);
      setUrl(newUrl);
    } catch (err) { alert("Error al subir la foto. Intentá de nuevo."); }
    finally { setCarg(false); e.target.value = ""; }
  }

  async function quitar() {
    setCarg(true);
    try { await deleteFotoStorage(tipo, id); clearFotoCache(tipo, id); setUrl(null); }
    catch {}
    finally { setCarg(false); }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#f0f4f2", border: "1px solid #d0e8d8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {cargando
          ? <span style={{ fontSize: 10, color: "#888" }}>...</span>
          : url
          ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 22 }}>📷</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
      <button style={G.btn(url ? "#4a8a5a" : "#1a7a3a")} onClick={() => inputRef.current.click()} disabled={cargando}>
        {cargando ? "Subiendo..." : url ? "Cambiar" : "Subir foto"}
      </button>
      {url && !cargando && <button style={G.btn("#dc2626")} onClick={quitar}>✕</button>}
    </div>
  );
}

// ── Sección editable ───────────────────────────────────────────────
function SeccionItems({ titulo, icon, items, onUpdate, tipoFoto, mostrarSimDoTri = false }) {
  function set(id, campo, valor) { onUpdate(items.map(i => i.id === id ? { ...i, [campo]: valor } : i)); }
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#1a3a25", marginBottom: 12 }}>{icon} {titulo}</div>
      {items.map(item => (
        <div key={item.id} style={{ ...G.card, opacity: item.disponible ? 1 : 0.55 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <FotoUpload tipo={tipoFoto} id={item.id} />
            <div style={{ flex: "2 1 160px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input style={{ ...G.input, width: "100%", fontWeight: 700, fontSize: 14 }}
                value={item.nombre} onChange={e => set(item.id, "nombre", e.target.value)} />
              {item.desc !== undefined && (
                <input style={{ ...G.input, width: "100%", fontSize: 12, color: "#555" }}
                  value={item.desc} onChange={e => set(item.id, "desc", e.target.value)} placeholder="Descripción..." />
              )}
              {item.detalle !== undefined && (
                <input style={{ ...G.input, width: "100%", fontSize: 12, color: "#555" }}
                  value={item.detalle} onChange={e => set(item.id, "detalle", e.target.value)} placeholder="Detalle..." />
              )}
            </div>
            {mostrarSimDoTri ? (
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
                {[["simple","Simple"],["doble","Doble"],["triple","Triple"]].map(([k, l]) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 10, color: "#888" }}>{l}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 12, color: "#888" }}>$</span>
                      <input type="number" style={{ ...G.input, width: 90, textAlign: "right" }}
                        value={item[k]} onChange={e => set(item.id, k, parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#888" }}>$</span>
                <input type="number" style={{ ...G.input, width: 100, textAlign: "right" }}
                  value={item.precio} onChange={e => set(item.id, "precio", parseFloat(e.target.value) || 0)} />
              </div>
            )}
            <button style={G.btn(item.disponible ? "#f59e0b" : "#1a7a3a")} onClick={() => set(item.id, "disponible", !item.disponible)}>
              {item.disponible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mapa admin ─────────────────────────────────────────────────────
function MapaAdmin({ zona, onGuardar, onLimpiar }) {
  const ref     = useRef(null);
  const mapRef  = useRef(null);
  const drawnRef= useRef(null);

  function initMap(el) {
    if (!el || mapRef.current) return;
    import("leaflet").then(Lmod => {
      const L = Lmod.default || Lmod;
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css"; link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const map = L.map(el).setView([-27.47, -58.83], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      if (zona.length > 2) { L.polygon(zona, { color: "#1a7a3a", fillColor: "#1a7a3a", fillOpacity: 0.15, weight: 2 }).addTo(map); map.fitBounds(zona); }
      const puntos = [], markers = [];
      let polyLine = null;
      map.on("click", e => {
        puntos.push([e.latlng.lat, e.latlng.lng]);
        markers.push(L.circleMarker([e.latlng.lat, e.latlng.lng], { radius: 5, color: "#1a7a3a", fillOpacity: 1 }).addTo(map));
        if (polyLine) polyLine.remove();
        if (puntos.length > 1) polyLine = L.polyline([...puntos, puntos[0]], { color: "#1a7a3a", weight: 2 }).addTo(map);
      });
      drawnRef.current = { puntos, markers, getLine: () => polyLine };
      mapRef.current = map;
    });
  }

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
        <strong>Cómo usar:</strong> Hacé click en el mapa para marcar los puntos del área de delivery.
        {zona.length > 2 && <span style={{ color: "#1a7a3a", fontWeight: 700 }}> ✅ Zona guardada ({zona.length} puntos).</span>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button style={G.btn()} onClick={guardar}>✅ Guardar zona</button>
        <button style={G.btn("#dc2626")} onClick={limpiar}>🗑 Limpiar</button>
      </div>
      <div ref={el => initMap(el)} style={{ height: 460, borderRadius: 12, overflow: "hidden", border: "1px solid #d4edd9" }} />
    </div>
  );
}

// ── Panel principal ────────────────────────────────────────────────
export default function PaginaAdmin() {
  const [logueado, setLogueado] = useState(() => localStorage.getItem(LS_SESSION) === "1");
  const [tab, setTab]           = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [flashOk, setFlashOk]   = useState(false);

  const [burgers,      setBurgers]      = useState(BURGERS_DEFAULT);
  const [guarniciones, setGuarniciones] = useState(GUARNICIONES_DEFAULT);
  const [extras,       setExtras]       = useState(EXTRAS_DEFAULT);
  const [bebidas,      setBebidas]      = useState(BEBIDAS_DEFAULT);
  const [zona,         setZona]         = useState([]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!logueado) return;
    const unsubMenu = subscribeMenu(data => {
      setBurgers(data.burgers);
      setGuarniciones(data.guarniciones);
      setExtras(data.extras);
      setBebidas(data.bebidas);
      setCargando(false);
    });
    const unsubZona = subscribeZona(z => setZona(z));
    return () => { unsubMenu(); unsubZona(); };
  }, [logueado]);

  async function guardarMenu() {
    setGuardando(true);
    try {
      await saveMenuFirestore({ burgers, guarniciones, extras, bebidas });
      setFlashOk(true); setTimeout(() => setFlashOk(false), 2500);
    } catch { alert("Error al guardar. Revisá tu conexión."); }
    finally { setGuardando(false); }
  }

  async function guardarZona(z) {
    setZona(z);
    await saveZonaFirestore(z);
    alert("✅ Zona guardada");
  }

  if (!logueado) return <Login onLogin={() => setLogueado(true)} />;

  const urlCliente = `${window.location.origin}/`;

  return (
    <div style={G.page}>
      <div style={G.header}>
        <div>
          <div style={G.title}>🍔 Roses Burgers — Admin</div>
          <div style={{ fontSize: 12, color: "#6ab88a", marginTop: 2 }}>Panel de pedidos online</div>
        </div>
        <button onClick={() => { localStorage.removeItem(LS_SESSION); setLogueado(false); }} style={{ ...G.btn("#ffffff22", "#fff"), fontSize: 12 }}>
          Cerrar sesión
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Link cliente */}
        <div style={{ background: "#e8f5ec", border: "1px solid #a8d5b5", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1a3a25", marginBottom: 8 }}>🔗 Link para clientes</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <code style={{ background: "#fff", border: "1px solid #c0dcc8", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#1a7a3a", flex: 1, wordBreak: "break-all" }}>{urlCliente}</code>
            <button style={G.btn()} onClick={() => navigator.clipboard.writeText(urlCliente)}>📋 Copiar</button>
            <button style={G.btn("#2563eb")} onClick={() => window.open(urlCliente, "_blank")}>🔍 Ver</button>
          </div>
        </div>

        {/* Flash guardado */}
        {flashOk && (
          <div style={{ background: "#e8f5ec", border: "1px solid #1a7a3a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontWeight: 700, color: "#1a7a3a", fontSize: 13 }}>
            ✅ Cambios guardados — ya los ven todos los clientes
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["🍔 Hamburguesas", "🍟 Guarniciones", "➕ Extras", "🥤 Bebidas", "🗺️ Zona Delivery"].map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={G.tab(tab === i)}>{t}</button>
          ))}
        </div>

        {cargando ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>Cargando menú...</div>
        ) : (
          <>
            {tab < 4 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={guardarMenu} disabled={guardando} style={{ ...G.btn(), padding: "10px 24px", fontSize: 14, opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? "Guardando..." : "💾 Guardar cambios"}
                </button>
              </div>
            )}

            {tab === 0 && <SeccionItems titulo="Hamburguesas" icon="🍔" items={burgers} onUpdate={setBurgers} tipoFoto="burger" mostrarSimDoTri />}
            {tab === 1 && <SeccionItems titulo="Guarniciones" icon="🍟" items={guarniciones} onUpdate={setGuarniciones} tipoFoto="guar" />}
            {tab === 2 && <SeccionItems titulo="Extras para la burger" icon="➕" items={extras} onUpdate={setExtras} tipoFoto="extra" />}
            {tab === 3 && <SeccionItems titulo="Bebidas" icon="🥤" items={bebidas} onUpdate={setBebidas} tipoFoto="bebida" />}
            {tab === 4 && <MapaAdmin zona={zona} onGuardar={guardarZona} onLimpiar={async () => { setZona([]); await saveZonaFirestore([]); }} />}
          </>
        )}
      </div>
    </div>
  );
}
