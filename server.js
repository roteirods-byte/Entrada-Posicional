// server.js – backend simples para o AUTOTRADER
// Lê o JSON gerado pelo worker_entrada.py e devolve para o painel.

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// CONFIG BÁSICA
// =========================

const PORT = process.env.PORT || 8080;

const DEFAULT_ENTRADA_PATH =
  "/home/roteiro_ds/autotrader-planilhas-python/data/entrada.json";

const DATA_FILE = process.env.ENTRADA_JSON_PATH || DEFAULT_ENTRADA_PATH;

console.log("[server] Usando arquivo de entrada:", DATA_FILE);

// =========================
// FUNÇÃO AUXILIAR
// =========================

function lerJsonSeguro(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    console.log(
      "[server] JSON carregado com sucesso:",
      filePath,
      "tipo raiz:",
      typeof parsed
    );

    return parsed;
  } catch (err) {
    console.error("[server] Erro ao ler JSON:", filePath, err.message);
    return null;
  }
}

// =========================
// ROTAS
// =========================

// Health-check simples
app.get("/health", (req, res) => {
  const existe = fs.existsSync(DATA_FILE);
  res.json({
    status: "ok",
    entrada_json_exists: existe,
    entrada_json_path: DATA_FILE,
  });
});

// Rota principal de ENTRADA
app.get("/entrada", (req, res) => {
  const dados = lerJsonSeguro(DATA_FILE);

  if (!dados) {
    return res.status(500).json({
      erro: "Nao foi possivel ler o arquivo de entrada",
      arquivo: DATA_FILE,
    });
  }

  // Se o arquivo já tem o formato { swing: [...], posicional: [...] },
  // devolvemos exatamente isso para o painel.
  if (Array.isArray(dados)) {
    // Proteção: se por algum motivo o arquivo virou array,
    // devolvemos como swing e posicional vazios.
    console.warn(
      "[server] Aviso: entrada.json no formato de array. Esperado objeto com swing/posicional."
    );
    return res.json({ swing: [], posicional: [] });
  }

  const swing = Array.isArray(dados.swing) ? dados.swing : [];
  const posicional = Array.isArray(dados.posicional) ? dados.posicional : [];

  console.log(
    `[server] Respondendo /entrada com ${swing.length} swing e ${posicional.length} posicional`
  );

  res.json({
    swing,
    posicional,
  });
});

// =========================
// SUBIR O SERVIDOR
// =========================

app.listen(PORT, () => {
  console.log(`[server] Backend rodando na porta ${PORT}`);
});
