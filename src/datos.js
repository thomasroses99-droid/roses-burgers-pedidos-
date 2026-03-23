import { db, storage, doc, setDoc, onSnapshot, ref, uploadString, getDownloadURL, deleteObject } from "./firebase.js";

// ── Datos por defecto ─────────────────────────────────────────────
export const BURGERS_DEFAULT = [
  { id: 1,  nombre: "CHEESEBURGER",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, aderezo a base de mayonesa.",                                      simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 2,  nombre: "ROSES",         tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, ketchup, mayonesa, cebolla brunoise.",                              simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 3,  nombre: "1967",          tag: null,        desc: "Pan brioche, doble cheddar, medallón 100gr, lechuga, cebolla, pepino, aderezo a base de mayonesa.",            simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 4,  nombre: "CLASSIC",       tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, lechuga, tomate, cebolla, pepino, salsa mil islas.",               simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 5,  nombre: "CHEESE ONION",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón smashed 100gr, cebolla, aderezo a base de mayonesa.",                     simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 6,  nombre: "COWBOY",        tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, cowboy butter.",                                                   simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 7,  nombre: "SMOKEY BACON",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, cebolla crispy, barbacoa.",                       simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 8,  nombre: "BLUE CHEESE",   tag: "RENOVADA", desc: "Pan brioche, roquefort, medallón 100gr, rúcula, panceta, cebolla caramelizada, honey mustard.",                simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 9,  nombre: "STACKED ONION", tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, aros de cebolla, stacked sauce.",                simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 10, nombre: "CHEESE BACON",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, bacon sauce.",                                    simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 11, nombre: "BIGGIE BURGER", tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, lechuga, cebolla morada, pepino, tasty sauce.",  simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 12, nombre: "CRISPY GARLIC", tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, cebolla crispy, alioli.",                         simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 13, nombre: "RUBY CLOVE",    tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, cebolla morada brunoise, alioli.",                                  simple: 11000, doble: 13000, triple: 15000, disponible: true },
];

export const GUARNICIONES_DEFAULT = [
  { id: "g1", nombre: "Papas Fritas",    detalle: "Chicas",          precio: 3500,  disponible: true },
  { id: "g2", nombre: "Papas Cheddar",   detalle: "Grandes",         precio: 8000,  disponible: true },
  { id: "g3", nombre: "Aros de Cebolla", detalle: "Grandes · 18 u.", precio: 10000, disponible: true },
  { id: "g4", nombre: "Aros de Cebolla", detalle: "Chicas · 9 u.",   precio: 5500,  disponible: true },
  { id: "g5", nombre: "Nuggets",         detalle: "10 u.",           precio: 6500,  disponible: true },
  { id: "g6", nombre: "Nuggets G",       detalle: "Grandes · 20 u.", precio: 12000, disponible: true },
];

export const EXTRAS_DEFAULT = [
  { id: "e1", nombre: "Medallón + Queso Extra", precio: 2500, disponible: true },
  { id: "e2", nombre: "Panceta",                precio: 1500, disponible: true },
  { id: "e3", nombre: "Cheddar",                precio: 1000, disponible: true },
  { id: "e4", nombre: "Pepino",                 precio: 500,  disponible: true },
  { id: "e5", nombre: "Cebolla",                precio: 200,  disponible: true },
];

export const BEBIDAS_DEFAULT = [
  { id: "b1", nombre: "Gaseosa", detalle: "Pepsi / Pepsi Black / 7UP / Mirinda 354cc", precio: 3000, disponible: true },
];

// ── Firestore: menú ───────────────────────────────────────────────
const MENU_DOC = doc(db, "pedidos-online", "menu");

export async function saveMenuFirestore(data) {
  await setDoc(MENU_DOC, {
    burgers:      JSON.stringify(data.burgers),
    guarniciones: JSON.stringify(data.guarniciones),
    extras:       JSON.stringify(data.extras),
    bebidas:      JSON.stringify(data.bebidas),
  });
}

// Suscripción en tiempo real — llama a callback({ burgers, guarniciones, extras, bebidas })
export function subscribeMenu(callback) {
  return onSnapshot(MENU_DOC, snap => {
    if (!snap.exists()) { callback({ burgers: BURGERS_DEFAULT, guarniciones: GUARNICIONES_DEFAULT, extras: EXTRAS_DEFAULT, bebidas: BEBIDAS_DEFAULT }); return; }
    const d = snap.data();
    callback({
      burgers:      safeJSON(d.burgers,      BURGERS_DEFAULT),
      guarniciones: safeJSON(d.guarniciones, GUARNICIONES_DEFAULT),
      extras:       safeJSON(d.extras,       EXTRAS_DEFAULT),
      bebidas:      safeJSON(d.bebidas,      BEBIDAS_DEFAULT),
    });
  });
}

function safeJSON(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

// ── Firebase Storage: fotos ───────────────────────────────────────
// path: pedidos-fotos/{tipo}/{id}.jpg
export async function uploadFoto(tipo, id, base64) {
  const storageRef = ref(storage, `pedidos-fotos/${tipo}/${id}.jpg`);
  await uploadString(storageRef, base64, "data_url");
  return await getDownloadURL(storageRef);
}

export async function deleteFotoStorage(tipo, id) {
  try {
    const storageRef = ref(storage, `pedidos-fotos/${tipo}/${id}.jpg`);
    await deleteObject(storageRef);
  } catch {}
}

export async function getFotoURL(tipo, id) {
  try {
    const storageRef = ref(storage, `pedidos-fotos/${tipo}/${id}.jpg`);
    return await getDownloadURL(storageRef);
  } catch { return null; }
}

// ── Cache local de URLs de fotos (evita re-fetch) ─────────────────
const fotoCache = {};
export function getFotoCached(tipo, id) { return fotoCache[`${tipo}-${id}`] || null; }
export function setFotoCache(tipo, id, url) { fotoCache[`${tipo}-${id}`] = url; }
export function clearFotoCache(tipo, id) { delete fotoCache[`${tipo}-${id}`]; }

// ── Zona delivery ─────────────────────────────────────────────────
const ZONA_DOC = doc(db, "pedidos-online", "zona");
export async function saveZonaFirestore(zona) { await setDoc(ZONA_DOC, { zona: JSON.stringify(zona) }); }
export function subscribeZona(callback) {
  return onSnapshot(ZONA_DOC, snap => {
    if (!snap.exists()) { callback([]); return; }
    callback(safeJSON(snap.data().zona, []));
  });
}

// ── Comprimir imagen ──────────────────────────────────────────────
export function comprimirImagen(file, maxPx = 700, quality = 0.78) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export const fmt = n => `$${Number(n).toLocaleString("es-AR")}`;
