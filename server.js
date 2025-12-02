const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8080;

// Caminho ABSOLUTO do JSON gerado pelo worker_entrada.py
// (ajuste somente se o seu backend estiver em outro lugar)
const ENTRADA_PATH = "/home/roteiro_ds/autotrader-planilhas-python/data/entrada.json";

// --------- FUNÇÃO DE LEITURA E NORMALIZAÇÃO ---------
function lerEntradaJson() {
  try {
    if (!fs.existsSync(ENTRADA_PATH)) {
      console.warn("[api/entrada] Arquivo não encontrado:", ENTRADA_PATH);
      return { swing: [], posicional: [] };
    }

    const raw = fs.readFileSync(ENTRADA_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    const swing = Array.isArray(parsed.swing) ? parsed.swing : [];
    const posicional = Array.isArray(parsed.posicional) ? parsed.posicional : [];

    return { swing, posicional };
  } catch (err) {
    console.error("[api/entrada] Erro ao ler/parsing entrada.json:", err);
    return { swing: [], posicional: [] };
  }
}

// --------- ROTA DE API: /api/entrada ---------
app.get("/api/entrada", (req, res) => {
  const dados = lerEntradaJson();
  return res.json(dados);
});

// --------- INICIALIZAÇÃO DO SERVIDOR ---------
app.listen(PORT, () => {
  console.log(`Servidor API rodando na porta ${PORT} (http://localhost:${PORT})`);
});
