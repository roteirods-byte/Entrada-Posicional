// server.js - backend do painel AUTOTRADER (Entrada)

import express from "express";
import cors from "cors";
import fs from "fs";

const PORT = process.env.BACKEND_PORT || 8080;

// CAMINHO DO JSON GERADO PELO WORKER
const DATA_FILE =
  process.env.ENTRADA_JSON_PATH ||
 "/home/roteiro_ds/autotrader-planilhas-python/data/entrada.json";

const app = express();
app.use(cors());
app.use(express.json());

function safeReadEntradaJson() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.warn(`[backend] Arquivo não existe ainda: ${DATA_FILE}`);
      return { swing: [], posicional: [] };
    }

    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    if (!raw.trim()) {
      console.warn("[backend] Arquivo vazio, retornando listas vazias.");
      return { swing: [], posicional: [] };
    }

    const data = JSON.parse(raw);

    const swing = Array.isArray(data.swing) ? data.swing : [];
    const posicional = Array.isArray(data.posicional) ? data.posicional : [];

    console.log(
      `[backend] Lido ${swing.length} sinais swing, ${posicional.length} posicional.`
    );

    return { swing, posicional };
  } catch (err) {
    console.error("[backend] Erro ao ler/parsing entrada.json:", err);
    return { swing: [], posicional: [] };
  }
}

app.get("/entrada", (req, res) => {
  const { swing, posicional } = safeReadEntradaJson();
  res.json({ swing, posicional });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", file: DATA_FILE });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend ouvindo em http://0.0.0.0:${PORT}`);
  console.log(`Usando arquivo: ${DATA_FILE}`);
});
