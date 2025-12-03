const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8080;

// Permite receber JSON no corpo das requisições
app.use(express.json());

// Caminho da pasta com os arquivos estáticos do Vite (build)
const DIST_PATH = path.join(__dirname, "dist");

// Servir o front-end já compilado (dist)
app.use(express.static(DIST_PATH));

// Caminhos ABSOLUTOS dos arquivos gerados pelo backend Python
const ENTRADA_PATH =
  "/home/roteiro_ds/autotrader-planilhas-python/data/entrada.json";

const SAIDA_MONITORAMENTO_PATH =
  "/home/roteiro_ds/autotrader-planilhas-python/saida_monitoramento.json";

const SAIDA_MANUAL_PATH =
  "/home/roteiro_ds/autotrader-planilhas-python/saida_manual.json";

// --------- FUNÇÕES AUXILIARES ---------
function lerJsonSeguro(caminho, defaultValue) {
  try {
    if (!fs.existsSync(caminho)) {
      console.warn("[API] Arquivo não encontrado:", caminho);
      return defaultValue;
    }
    const raw = fs.readFileSync(caminho, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("[API] Erro ao ler/parsing:", caminho, err);
    return defaultValue;
  }
}

function salvarJsonSeguro(caminho, dados) {
  try {
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2), "utf-8");
    console.log("[API] Arquivo salvo com sucesso:", caminho);
    return true;
  } catch (err) {
    console.error("[API] Erro ao salvar:", caminho, err);
    return false;
  }
}

// --------- /api/entrada ---------
app.get("/api/entrada", (req, res) => {
  const parsed = lerJsonSeguro(ENTRADA_PATH, { swing: [], posicional: [] });

  const swing = Array.isArray(parsed.swing) ? parsed.swing : [];
  const posicional = Array.isArray(parsed.posicional) ? parsed.posicional : [];

  return res.json({ swing, posicional });
});

app.get("/api/saida", (req, res) => {
  try {
    const PATH = "/home/roteiro_ds/autotrader-planilhas-python/data/saida_monitoramento.json";
    if (!fs.existsSync(PATH)) {
      return res.json([]);
    }
    const raw = fs.readFileSync(PATH);
    const dados = JSON.parse(raw);
    return res.json(dados);
  } catch (e) {
    return res.json([]);
  }
});
// --------- /saida (monitoramento automático - SAÍDA 2) ---------
app.get("/saida", (req, res) => {
  const dados = lerJsonSeguro(SAIDA_MONITORAMENTO_PATH, []);
  return res.json(dados);
});

// --------- /saida/manual (entrada manual - SAÍDA 1) ---------

// GET: lista de operações manuais já salvas
app.get("/saida/manual", (req, res) => {
  const lista = lerJsonSeguro(SAIDA_MANUAL_PATH, []);
  return res.json(lista);
});

// POST: adiciona uma nova operação manual
app.post("/saida/manual", (req, res) => {
  const novaOperacao = req.body;

  if (!novaOperacao || typeof novaOperacao !== "object") {
    return res.status(400).json({ error: "Corpo da requisição inválido." });
  }

  const listaAtual = lerJsonSeguro(SAIDA_MANUAL_PATH, []);

  if (!Array.isArray(listaAtual)) {
    return res
      .status(500)
      .json({ error: "Formato inválido em saida_manual.json." });
  }

  listaAtual.push(novaOperacao);

  const ok = salvarJsonSeguro(SAIDA_MANUAL_PATH, listaAtual);
  if (!ok) {
    return res.status(500).json({ error: "Falha ao salvar saida_manual.json." });
  }

  return res.json({ ok: true, total: listaAtual.length });
});

// --------- ROTA CORINGA: devolve o index.html do Vite ---------
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_PATH, "index.html"));
});

// --------- INICIALIZAÇÃO DO SERVIDOR ---------
app.listen(PORT, () => {
  console.log(`Servidor AUTOTRADER rodando na porta ${PORT}`);
});
