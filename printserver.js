// ── Servidor de impresión local para Roses Burgers ────────────────
// Ejecutar con: node printserver.js
// Requiere Node.js instalado en la PC del local

const http = require("http");
const net  = require("net");
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { exec } = require("child_process");

const PORT = 3001;

function printToIP(ip, buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      if (err) reject(err); else resolve();
    };

    const timer = setTimeout(() => {
      socket.destroy();
      finish(new Error(`Tiempo de espera agotado conectando a ${ip}:9100`));
    }, 8000);

    socket.connect(9100, ip, () => {
      console.log(`[DEBUG] Conectado a ${ip}:9100 — enviando ${buffer.length} bytes`);
      socket.write(buffer, () => {
        clearTimeout(timer);
        socket.end();
      });
    });

    socket.on("close", () => finish(null));

    socket.on("error", (err) => {
      clearTimeout(timer);
      finish(err);
    });
  });
}

function printToWindows(name, buffer) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const tmp = path.join(os.tmpdir(), `rp_${id}.prn`);
    const ps1 = path.join(os.tmpdir(), `rp_${id}.ps1`);

    // Intenta primero escribir directo al puerto USB (bypasea el driver).
    // Si falla, cae al método RAW via winspool.
    const script =
`param($printer, $datafile)
$ErrorActionPreference = 'Stop'
$bytes = [IO.File]::ReadAllBytes($datafile)

# Metodo 1: puerto directo (bypasea driver - mas confiable para termicas USB)
try {
  $p = Get-WmiObject Win32_Printer -Filter "Name='$printer'"
  if ($p -and $p.PortName -match '^USB') {
    $port = $p.PortName
    $stream = [IO.File]::Open("\\\\.\\" + $port, [IO.FileMode]::Open, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
    $stream.Close()
    Write-Output "OK-puerto:$port"
    exit 0
  }
} catch {
  Write-Output "WARN puerto directo: $($_.Exception.Message)"
}

# Metodo 2: RAW via winspool.drv
$code = 'using System; using System.Runtime.InteropServices; public class WRP { [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { [MarshalAs(UnmanagedType.LPWStr)] public string pDocName; [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile; [MarshalAs(UnmanagedType.LPWStr)] public string pDataType; } [DllImport("winspool.drv",CharSet=CharSet.Unicode)] public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr p); [DllImport("winspool.drv")] public static extern bool ClosePrinter(IntPtr h); [DllImport("winspool.drv",CharSet=CharSet.Unicode)] public static extern int StartDocPrinter(IntPtr h, int l, DOCINFO d); [DllImport("winspool.drv")] public static extern bool EndDocPrinter(IntPtr h); [DllImport("winspool.drv")] public static extern bool StartPagePrinter(IntPtr h); [DllImport("winspool.drv")] public static extern bool EndPagePrinter(IntPtr h); [DllImport("winspool.drv")] public static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w); }'
Add-Type -TypeDefinition $code -Language CSharp
$h = [IntPtr]::Zero
$ok = [WRP]::OpenPrinter($printer, [ref]$h, [IntPtr]::Zero)
if (-not $ok) { throw "No se pudo abrir la impresora: $printer" }
$d = New-Object WRP+DOCINFO
$d.pDocName = "print"
$d.pDataType = "RAW"
[WRP]::StartDocPrinter($h, 1, $d)
[WRP]::StartPagePrinter($h)
$w = 0
[WRP]::WritePrinter($h, $bytes, $bytes.Length, [ref]$w)
[WRP]::EndPagePrinter($h)
[WRP]::EndDocPrinter($h)
[WRP]::ClosePrinter($h)
Write-Output "OK-raw"`;

    fs.writeFile(tmp, buffer, err => {
      if (err) return reject(err);
      fs.writeFile(ps1, script, "utf8", err2 => {
        if (err2) { fs.unlink(tmp, () => {}); return reject(err2); }
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}" -printer "${name}" -datafile "${tmp}"`, (err3, stdout, stderr) => {
          fs.unlink(tmp, () => {});
          fs.unlink(ps1, () => {});
          if (err3) {
            console.error("[WIN ERROR]", stderr || err3.message);
            reject(new Error(`Error imprimiendo en ${name}: ${stderr || err3.message}`));
          } else {
            console.log(`[WIN] ${stdout.trim()}`);
            resolve();
          }
        });
      });
    });
  });
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/test")) {
    const dest = new URL("http://localhost" + req.url).searchParams.get("dest") || "";
    const ESC = "\x1B", GS = "\x1D";
    const testStr = ESC + "@" +
      ESC + "a\x01" +
      ESC + "E\x01" + "PRUEBA DE IMPRESION\n" + ESC + "E\x00" +
      ESC + "a\x00" +
      "--------------------------------\n" +
      "Si ves esto, la impresora funciona\n" +
      "--------------------------------\n" +
      "\n\n\n\n\n" + GS + "V\x41\x00";

    const buffer = Buffer.from(testStr, "binary");
    const esIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(dest.trim());

    const fn = esIP ? printToIP(dest.trim(), buffer) : printToWindows(dest.trim(), buffer);
    fn.then(() => {
      console.log(`[TEST] Enviado a ${dest}`);
      res.writeHead(200); res.end("OK - prueba enviada a " + dest);
    }).catch(e => {
      console.error(`[TEST ERROR]`, e.message);
      res.writeHead(500); res.end("ERROR: " + e.message);
    });
    return;
  }

  if (req.method === "POST" && req.url === "/print") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const { ip, name, data } = JSON.parse(body);
        const buffer = Buffer.from(data, "base64");
        console.log(`[PRINT] Recibido ${buffer.length} bytes para ${ip || name}`);

        if (ip) {
          await printToIP(ip, buffer);
          console.log(`[OK] Impreso en ${ip}`);
        } else if (name) {
          await printToWindows(name, buffer);
          console.log(`[OK] Impreso en ${name}`);
        } else {
          throw new Error("Se requiere ip o name");
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error("[ERROR]", e.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("===========================================");
  console.log("  Roses Burgers - Servidor de Impresion");
  console.log(`  Corriendo en http://localhost:${PORT}`);
  console.log("  No cierres esta ventana mientras trabajas");
  console.log("===========================================");
});
