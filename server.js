const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// Porta do site (se não tiver variável PORT, usa 8090)
const PORT = process.env.PORT ? Number(process.env.PORT) : 8090;

// Pasta de dados do projeto (onde fica data/entrada.json)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

// Permite receber JSON no corpo das requisições
app.use(express.json());

// Pasta do front (Vite build)
const DIST_PATH = path.join(__dirname, "dist");
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
}

// --------- FUNÇÃO AUXILIAR (SEM ERRO) ---------
function lerJsonSeguro(arquivo, padrao) {
  try {
    if (!fs.existsSync(arquivo)) {
      console.warn("[API] Arquivo não encontrado:", arquivo);
      return padrao;
    }
    const raw = fs.readFileSync(arquivo, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[API] Erro ao ler JSON:", arquivo, e.message);
    return padrao;
  }
}

// --------- ROTAS ---------

// Health-check
app.get("/health", (req, res) => {
  return res.json({ ok: true, app: "Entrada-Posicional", port: PORT });
});

// GET /api/entrada - devolve o JSON inteiro gerado pelo worker
app.get("/api/entrada", (req, res) => {
  const file = path.join(DATA_DIR, "entrada.json");
  const padrao = {
    swing: [],
    posicional: [],
    total_moedas: 0,
    total_processadas: 0,
    ultima_atualizacao: null,
  };
  const dados = lerJsonSeguro(file, padrao);
  return res.json(dados);
});

// ROTA CORINGA: abre o site (se existir dist/index.html)
app.get("*", (req, res) => {
  const indexFile = path.join(DIST_PATH, "index.html");
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return res
    .status(200)
    .send("Front-end não encontrado (dist/index.html). API está ativa em /api/entrada");
});

// --------- INICIALIZAÇÃO DO SERVIDOR ---------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor ENTRADA rodando na porta ${PORT}`);
  console.log(`DATA_DIR: ${DATA_DIR}`);
});
