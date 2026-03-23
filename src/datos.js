// Datos por defecto — se cargan en localStorage la primera vez
export const BURGERS_DEFAULT = [
  { id: 1,  nombre: "CHEESEBURGER",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, aderezo a base de mayonesa.",                                                    simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 2,  nombre: "ROSES",         tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, ketchup, mayonesa, cebolla brunoise.",                                            simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 3,  nombre: "1967",          tag: null,        desc: "Pan brioche, doble cheddar, medallón 100gr, lechuga, cebolla, pepino, aderezo a base de mayonesa.",                          simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 4,  nombre: "CLASSIC",       tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, lechuga, tomate, cebolla, pepino, salsa mil islas.",                             simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 5,  nombre: "CHEESE ONION",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón smashed 100gr, cebolla, aderezo a base de mayonesa.",                                   simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 6,  nombre: "COWBOY",        tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, cowboy butter.",                                                                 simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 7,  nombre: "SMOKEY BACON",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, cebolla crispy, barbacoa.",                                     simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 8,  nombre: "BLUE CHEESE",   tag: "RENOVADA", desc: "Pan brioche, roquefort, medallón 100gr, rúcula, panceta, cebolla caramelizada, honey mustard.",                              simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 9,  nombre: "STACKED ONION", tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, aros de cebolla, stacked sauce.",                              simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 10, nombre: "CHEESE BACON",  tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, bacon sauce.",                                                  simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 11, nombre: "BIGGIE BURGER", tag: "RENOVADA", desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, lechuga, cebolla morada, pepino, tasty sauce.",                simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 12, nombre: "CRISPY GARLIC", tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, panceta ahumada, cebolla crispy, alioli.",                                       simple: 11000, doble: 13000, triple: 15000, disponible: true },
  { id: 13, nombre: "RUBY CLOVE",    tag: "NUEVA",    desc: "Pan brioche, doble cheddar, medallón 100gr, cebolla morada brunoise, alioli.",                                               simple: 11000, doble: 13000, triple: 15000, disponible: true },
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

// ── Storage helpers ───────────────────────────────────────────────
const K = {
  burgers:     "rb2-burgers",
  guarniciones:"rb2-guarniciones",
  extras:      "rb2-extras",
  bebidas:     "rb2-bebidas",
};

function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function loadBurgers()      { return lsGet(K.burgers,      BURGERS_DEFAULT);      }
export function loadGuarniciones() { return lsGet(K.guarniciones, GUARNICIONES_DEFAULT); }
export function loadExtras()       { return lsGet(K.extras,       EXTRAS_DEFAULT);       }
export function loadBebidas()      { return lsGet(K.bebidas,      BEBIDAS_DEFAULT);      }

export function saveBurgers(v)      { lsSet(K.burgers,      v); }
export function saveGuarniciones(v) { lsSet(K.guarniciones, v); }
export function saveExtras(v)       { lsSet(K.extras,       v); }
export function saveBebidas(v)      { lsSet(K.bebidas,      v); }

// Fotos
export const fotoKey = (tipo, id) => `rb2-foto-${tipo}-${id}`;
export function loadFoto(tipo, id) { return localStorage.getItem(fotoKey(tipo, id)) || null; }
export function saveFoto(tipo, id, b64) { localStorage.setItem(fotoKey(tipo, id), b64); }
export function deleteFoto(tipo, id) { localStorage.removeItem(fotoKey(tipo, id)); }

// Zona
export const LS_ZONA = "rb2-zona";
export function loadZona() { try { return JSON.parse(localStorage.getItem(LS_ZONA)) || []; } catch { return []; } }
export function saveZona(z) { localStorage.setItem(LS_ZONA, JSON.stringify(z)); }

// Comprimir imagen
export function comprimirImagen(file, maxPx = 600, quality = 0.78) {
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
