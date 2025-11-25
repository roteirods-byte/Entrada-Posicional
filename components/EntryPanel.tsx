// INÍCIO DO ARQUIVO
import React, { useEffect, useState } from "react";

type EntradaSignal = {
  par: string;
  sinal: string;
  preco: number;
  alvo: number;
  ganho_pct: number;
  assert_pct: number;
  data: string;
  hora: string;
};

type EntradaResponse = {
  swing: EntradaSignal[];
  posicional: EntradaSignal[];
};

const formatNumber = (value: number, decimals: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const EntryPanel: React.FC = () => {
  const [swingSignals, setSwingSignals] = useState<EntradaSignal[]>([]);
  const [posSignals, setPosSignals] = useState<EntradaSignal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("--:--:--");

  async function fetchEntrada() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/entrada", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: EntradaResponse = await response.json();

      setSwingSignals(data.swing || []);
      setPosSignals(data.posicional || []);

      const now = new Date();
      const hora = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setLastUpdate(hora);
    } catch (err) {
      console.error("[painel entrada] Erro ao buscar /api/entrada:", err);
      setError("Erro ao carregar dados de entrada.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // primeira carga ao abrir a página
    fetchEntrada();

    // auto-refresh a cada 5 minutos (300.000 ms)
    const intervalId = window.setInterval(fetchEntrada, 5 * 60 * 1000);

    // limpa o timer se o componente for desmontado
    return () => window.clearInterval(intervalId);
  }, []);
  
  const renderRow = (s: EntradaSignal, idx: number) => {
  const ganho = Number(s.ganho_pct ?? 0);
  const assertVal = Number(s.assert_pct ?? 0);

  // COR DO TEXTO DO SINAL (LONG/SHORT/NAO ENTRAR)
  const sinalColor =
    s.sinal === "LONG"
      ? "text-green-400"
      : s.sinal === "SHORT"
      ? "text-red-400"
      : "text-white";

  // REGRA 1: GANHO% >= 3 => VERDE, ABAIXO DE 3 => VERMELHO
  const ganhoColor = ganho >= 3 ? "text-green-400" : "text-red-400";

  // REGRA 2: ASSERT% >= 65 => VERDE, ABAIXO DE 65 => VERMELHO
  const assertColor = assertVal >= 65 ? "text-green-400" : "text-red-400";

  return (
    <tr key={`${s.par}-${idx}`} className="text-sm text-white">
      <td className="px-3 py-1">{s.par}</td>
      <td className={`px-3 py-1 font-semibold ${sinalColor}`}>{s.sinal}</td>
      <td className="px-3 py-1">
        {formatNumber(s.preco ?? 0, 3)}
      </td>
      <td className="px-3 py-1">
        {formatNumber(s.alvo ?? 0, 3)}
      </td>
      <td className={`px-3 py-1 ${ganhoColor}`}>
        {formatNumber(ganho, 2)}%
      </td>
      <td className={`px-3 py-1 ${assertColor}`}>
        {formatNumber(assertVal, 2)}%
      </td>
      <td className="px-3 py-1">{s.data}</td>
      <td className="px-3 py-1">{s.hora}</td>
    </tr>
  );
};
  
  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-bold mb-2">PAINEL ENTRADA</h2>

      <p className="text-sm mb-4">
        Dados atualizados às:{" "}
        <span className="font-mono">{lastUpdate}</span>
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 text-sm text-gray-300">
          Atualizando dados...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ENTRADA 4H – SWING */}
        <div className="bg-[#04162a] rounded-xl border border-[#1f3b5c] overflow-hidden">
          <div className="px-4 py-2 border-b border-[#1f3b5c]">
            <span className="text-sm font-semibold text-orange-300">
              ENTRADA 4H – SWING
            </span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#06213c] text-xs text-orange-300">
              <tr>
                <th className="px-3 py-2">PAR</th>
                <th className="px-3 py-2">SINAL</th>
                <th className="px-3 py-2">PREÇO</th>
                <th className="px-3 py-2">ALVO</th>
                <th className="px-3 py-2">GANHO %</th>
                <th className="px-3 py-2">ASSERT %</th>
                <th className="px-3 py-2">DATA</th>
                <th className="px-3 py-2">HORA</th>
              </tr>
            </thead>
            <tbody>
              {swingSignals.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-3 text-center text-sm text-gray-400"
                  >
                    Nenhum sinal disponível.
                  </td>
                </tr>
              ) : (
                swingSignals.map(renderRow)
              )}
            </tbody>
          </table>
        </div>

        {/* ENTRADA 1D – POSICIONAL */}
        <div className="bg-[#04162a] rounded-xl border border-[#1f3b5c] overflow-hidden">
          <div className="px-4 py-2 border-b border-[#1f3b5c]">
            <span className="text-sm font-semibold text-orange-300">
              ENTRADA 1D – POSICIONAL
            </span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#06213c] text-xs text-orange-300">
              <tr>
                <th className="px-3 py-2">PAR</th>
                <th className="px-3 py-2">SINAL</th>
                <th className="px-3 py-2">PREÇO</th>
                <th className="px-3 py-2">ALVO</th>
                <th className="px-3 py-2">GANHO %</th>
                <th className="px-3 py-2">ASSERT %</th>
                <th className="px-3 py-2">DATA</th>
                <th className="px-3 py-2">HORA</th>
              </tr>
            </thead>
            <tbody>
              {posSignals.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-3 text-center text-sm text-gray-400"
                  >
                    Nenhum sinal disponível.
                  </td>
                </tr>
              ) : (
                posSignals.map(renderRow)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EntryPanel;
// FIM DO ARQUIVO
