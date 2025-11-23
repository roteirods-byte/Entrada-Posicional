// INÍCIO DO ARQUIVO
import React, { useEffect, useState } from "react";

type MoedaItem = {
  id?: string;
  ticker: string;
  selected?: boolean;
};

const normalizarTicker = (t: string) => t.trim().toUpperCase();

const MoedasPanel: React.FC = () => {
  const [moedas, setMoedas] = useState<MoedaItem[]>([]);
  const [novaMoeda, setNovaMoeda] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregarMoedas() {
    try {
      setLoading(true);
      setErro(null);

      const res = await fetch("/api/moedas", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Aceita vários formatos de resposta para não quebrar o backend:
      // 1) ["BTC","ETH",...]
      // 2) { moedas: ["BTC","ETH",...] }
      // 3) { moedas: [{ ticker: "BTC" }, ...] }
      let lista: MoedaItem[] = [];

      if (Array.isArray(data)) {
        lista = data.map((x: any) =>
          typeof x === "string"
            ? { ticker: normalizarTicker(x) }
            : { ticker: normalizarTicker(x.ticker ?? "") }
        );
      } else if (data && Array.isArray(data.moedas)) {
        lista = data.moedas.map((x: any) =>
          typeof x === "string"
            ? { ticker: normalizarTicker(x) }
            : { ticker: normalizarTicker(x.ticker ?? "") }
        );
      }

      // Ordena em ordem alfabética
      lista.sort((a, b) => a.ticker.localeCompare(b.ticker));

      setMoedas(lista);
    } catch (err) {
      console.error("[painel moedas] Erro ao carregar /api/moedas:", err);
      setErro("Erro ao carregar lista de moedas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarMoedas();
  }, []);

  async function adicionarMoeda() {
    const ticker = normalizarTicker(novaMoeda);
    if (!ticker) return;

    if (moedas.some((m) => m.ticker === ticker)) {
      setMensagem(`A moeda ${ticker} já está cadastrada.`);
      return;
    }

    try:
      setSalvando(true);
      setErro(null);
      setMensagem(null);

      const res = await fetch("/api/moedas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setNovaMoeda("");
      await carregarMoedas();
      setMensagem(`Moeda ${ticker} adicionada com sucesso.`);
    } catch (err) {
      console.error("[painel moedas] Erro ao adicionar moeda:", err);
      setErro("Erro ao adicionar moeda.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerSelecionadas() {
    const selecionadas = moedas.filter((m) => m.selected);
    if (selecionadas.length === 0) {
      setMensagem("Nenhuma moeda selecionada para remover.");
      return;
    }

    const tickers = selecionadas.map((m) => m.ticker);

    try {
      setSalvando(true);
      setErro(null);
      setMensagem(null);

      const res = await fetch("/api/moedas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      await carregarMoedas();
      setMensagem(`Removidas: ${tickers.join(", ")}`);
    } catch (err) {
      console.error("[painel moedas] Erro ao remover moedas:", err);
      setErro("Erro ao remover moedas.");
    } finally {
      setSalvando(false);
    }
  }

  function alternarSelecao(ticker: string) {
    setMoedas((lista) =>
      lista.map((m) =>
        m.ticker === ticker ? { ...m, selected: !m.selected } : m
      )
    );
  }

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-bold mb-2">PAINEL MOEDAS</h2>

      <p className="text-sm mb-4">
        Controle das moedas cadastradas na automação. Esta lista alimenta os
        painéis de ENTRADA e SAÍDA.
      </p>

      {erro && (
        <div className="mb-3 text-sm text-red-400">
          {erro}
        </div>
      )}

      {mensagem && !erro && (
        <div className="mb-3 text-sm text-green-400">
          {mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6">
        {/* LISTA DE MOEDAS */}
        <div className="bg-[#04162a] rounded-2xl border border-[#1f3b5c] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-orange-300">
              MOEDAS CADASTRADAS
            </span>
            {loading && (
              <span className="text-xs text-gray-300">
                Atualizando lista...
              </span>
            )}
          </div>

          <div className="border border-[#1f3b5c] rounded-xl overflow-hidden flex-1 bg-[#02101f]">
            <div className="bg-[#06213c] text-xs text-orange-300 px-3 py-2 flex items-center">
              <span className="w-10">SEL</span>
              <span className="flex-1">MOEDA</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {moedas.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400">
                  Nenhuma moeda cadastrada.
                </div>
              ) : (
                moedas.map((m) => (
                  <label
                    key={m.ticker}
                    className="flex items-center px-3 py-1 text-sm border-b border-[#0b243d] last:border-b-0 cursor-pointer hover:bg-[#06213c]"
                  >
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={!!m.selected}
                      onChange={() => alternarSelecao(m.ticker)}
                    />
                    <span className="font-mono">{m.ticker}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={removerSelecionadas}
              disabled={salvando}
              className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-sm font-semibold disabled:opacity-60"
            >
              REMOVER SELECIONADAS
            </button>
          </div>
        </div>

        {/* ADICIONAR NOVA MOEDA */}
        <div className="bg-[#04162a] rounded-2xl border border-[#1f3b5c] p-4 flex flex-col">
          <span className="text-sm font-semibold text-orange-300 mb-3">
            ADICIONAR NOVA MOEDA
          </span>

          <label className="text-xs mb-1 text-gray-200">
            DIGITE O TICKER (ex: BTC, ETH, SOL)
          </label>
          <input
            type="text"
            value={novaMoeda}
            onChange={(e) => setNovaMoeda(e.target.value)}
            className="bg-[#02101f] border border-[#1f3b5c] rounded-xl px-3 py-2 text-sm text-white mb-3 outline-none focus:ring-2 focus:ring-orange-400/60"
            placeholder="Ex: BTC"
          />

          <button
            type="button"
            onClick={adicionarMoeda}
            disabled={salvando || !novaMoeda.trim()}
            className="px-4 py-2 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-sm font-semibold disabled:opacity-60"
          >
            ADICIONAR
          </button>

          <p className="text-xs text-gray-300 mt-4">
            • A lista deve conter sempre as 39 moedas oficiais do projeto,
            em ordem alfabética. <br />
            • Quando você adicionar ou remover moedas aqui, os painéis de
            ENTRADA e SAÍDA passam a usar automaticamente essa lista.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoedasPanel;
// FIM DO ARQUIVO
