import React, { useEffect, useState } from "react";

type Side = "LONG" | "SHORT";
type Modo = "SWING" | "POSICIONAL";

type OperacaoSaida = {
  id: string;
  par: string;
  side: Side;
  modo: Modo;
  entrada: number;
  preco: number;
  alvo_1: number;
  alvo_2: number;
  alvo_3: number;
  ganho_1_pct: number;
  ganho_2_pct: number;
  ganho_3_pct: number;
  pnl_pct: number;
  situacao: string;
  alav: number;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
};

const MOEDAS = [
  "AAVE", "ADA", "APT", "ARB", "ATOM", "AVAX", "AXS", "BCH", "BNB",
  "BTC", "DOGE", "DOT", "ETH", "FET", "FIL", "FLUX", "ICP", "INJ",
  "LDO", "LINK", "LTC", "NEAR", "OP", "PEPE", "POL", "RATS", "RENDER",
  "RUNE", "SEI", "SHIB", "SOL", "SUI", "TIA", "TNSR", "TON", "TRX",
  "UNI", "WIF", "XRP",
];

const STORAGE_KEY = "autotrader_exit_ops_v2";

const ExitPanel: React.FC = () => {
  const [par, setPar] = useState<string>("ADA");
  const [side, setSide] = useState<Side>("LONG");
  const [modo, setModo] = useState<Modo>("SWING");
  const [entrada, setEntrada] = useState<string>("");
  const [alav, setAlav] = useState<string>("1");
  const [operacoes, setOperacoes] = useState<OperacaoSaida[]>([]);

  // Carrega operações salvas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: OperacaoSaida[] = JSON.parse(raw);
        setOperacoes(parsed);
      }
    } catch (e) {
      console.error("Erro ao carregar operações de saída:", e);
    }
  }, []);

  // Salva operações sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operacoes));
    } catch (e) {
      console.error("Erro ao salvar operações de saída:", e);
    }
  }, [operacoes]);

  function handleAdicionar() {
    const entradaNum = parseFloat(entrada.replace(",", "."));
    const alavNum = parseInt(alav || "1", 10);

    if (!entradaNum || entradaNum <= 0 || !Number.isFinite(entradaNum)) {
      alert("Informe um preço de entrada válido.");
      return;
    }
    if (!alavNum || alavNum <= 0) {
      alert("Informe uma alavancagem válida.");
      return;
    }

    const agora = new Date();
    const dataStr = agora.toISOString().slice(0, 10); // AAAA-MM-DD
    const horaStr = agora.toTimeString().slice(0, 5); // HH:MM

    const entradaFix = parseFloat(entradaNum.toFixed(3));

    const novaOp: OperacaoSaida = {
      id: `${par}-${modo}-${side}-${agora.getTime()}`,
      par,
      side,
      modo,
      entrada: entradaFix,
      // por enquanto iguais à entrada; worker depois atualiza
      preco: entradaFix,
      alvo_1: entradaFix,
      alvo_2: entradaFix,
      alvo_3: entradaFix,
      ganho_1_pct: 0.0,
      ganho_2_pct: 0.0,
      ganho_3_pct: 0.0,
      pnl_pct: 0.0,
      situacao: "ABERTA",
      alav: alavNum,
      data: dataStr,
      hora: horaStr,
    };

    setOperacoes((prev) => [...prev, novaOp]);
    setEntrada("");
  }

  function handleExcluir(id: string) {
    if (!window.confirm("Deseja realmente excluir esta operação?")) {
      return;
    }
    setOperacoes((prev) => prev.filter((op) => op.id !== id));
  }

  // Ordena por PAR em ordem alfabética
  const operacoesOrdenadas = [...operacoes].sort((a, b) =>
    a.par.localeCompare(b.par)
  );

  return (
    <div className="bg-slate-950 rounded-2xl p-4 text-white">
      <h1 className="text-2xl font-bold text-orange-400 mb-4">
        Monitoramento de Saída
      </h1>

      {/* FORMULÁRIO */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* PAR */}
        <select
          value={par}
          onChange={(e) => setPar(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
        >
          {MOEDAS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* SIDE */}
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as Side)}
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
        >
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>

        {/* MODO */}
        <select
          value={modo}
          onChange={(e) => setModo(e.target.value as Modo)}
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
        >
          <option value="SWING">SWING</option>
          <option value="POSICIONAL">POSICIONAL</option>
        </select>

        {/* ENTRADA */}
        <input
          type="text"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Entrada"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm w-[90px]"
        />

        {/* ALAV (somente digitar) */}
        <input
          type="text"
          value={alav}
          onChange={(e) => setAlav(e.target.value)}
          placeholder="Alav"
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm w-[60px]"
        />

        <button
          type="button"
          onClick={handleAdicionar}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-1 rounded text-sm"
        >
          ADICIONAR
        </button>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-xs text-white border-collapse">
          <thead>
            <tr className="bg-slate-900">
              <th className="px-2 py-1 text-left text-orange-300 w-[60px] border-r border-white/10">
                PAR
              </th>
              <th className="px-2 py-1 text-left text-orange-300 w-[60px] border-r border-white/10">
                SIDE
              </th>
              <th className="px-2 py-1 text-left text-orange-300 w-[90px] border-r border-white/10">
                MODO
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[90px] border-r border-white/10">
                ENTRADA
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[90px] border-r border-white/10">
                PREÇO
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[90px] border-r border-white/10">
                ALVO 1 US
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[70px] border-r border-white/10">
                GANHO 1%
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[90px] border-r border-white/10">
                ALVO 2 US
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[70px] border-r border-white/10">
                GANHO 2%
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[90px] border-r border-white/10">
                ALVO 3 US
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[70px] border-r border-white/10">
                GANHO 3%
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[70px] border-r border-white/10">
                PNL %
              </th>
              <th className="px-2 py-1 text-left text-orange-300 w-[110px] border-r border-white/10">
                SITUAÇÃO
              </th>
              <th className="px-2 py-1 text-right text-orange-300 w-[60px] border-r border-white/10">
                ALAV
              </th>
              <th className="px-2 py-1 text-center text-orange-300 w-[100px] border-r border-white/10">
                DATA
              </th>
              <th className="px-2 py-1 text-center text-orange-300 w-[80px] border-r border-white/10">
                HORA
              </th>
              <th className="px-2 py-1 text-center text-orange-300 w-[70px]">
                EXCLUIR
              </th>
            </tr>
          </thead>
          <tbody>
            {operacoesOrdenadas.length === 0 ? (
              <tr>
                <td
                  colSpan={17}
                  className="px-2 py-4 text-center text-slate-300"
                >
                  Nenhuma operação cadastrada.
                </td>
              </tr>
            ) : (
              operacoesOrdenadas.map((op) => (
                <tr
                  key={op.id}
                  className="border-b border-slate-800"
                >
                  <td className="px-2 py-1 w-[60px] border-r border-white/10">
                    {op.par}
                  </td>
                  <td
                    className={`px-2 py-1 w-[60px] border-r border-white/10 ${
                      op.side === "LONG"
                        ? "text-green-400 font-semibold"
                        : "text-red-400 font-semibold"
                    }`}
                  >
                    {op.side}
                  </td>
                  <td className="px-2 py-1 w-[90px] border-r border-white/10">
                    {op.modo}
                  </td>
                  <td className="px-2 py-1 w-[90px] text-right border-r border-white/10">
                    {op.entrada.toFixed(3)}
                  </td>
                  <td className="px-2 py-1 w-[90px] text-right border-r border-white/10">
                    {op.preco.toFixed(3)}
                  </td>
                  <td className="px-2 py-1 w-[90px] text-right border-r border-white/10">
                    {op.alvo_1.toFixed(3)}
                  </td>
                  <td className="px-2 py-1 w-[70px] text-right border-r border-white/10">
                    {op.ganho_1_pct.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1 w-[90px] text-right border-r border-white/10">
                    {op.alvo_2.toFixed(3)}
                  </td>
                  <td className="px-2 py-1 w-[70px] text-right border-r border-white/10">
                    {op.ganho_2_pct.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1 w-[90px] text-right border-r border-white/10">
                    {op.alvo_3.toFixed(3)}
                  </td>
                  <td className="px-2 py-1 w-[70px] text-right border-r border-white/10">
                    {op.ganho_3_pct.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1 w-[70px] text-right border-r border-white/10">
                    {op.pnl_pct.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1 w-[110px] border-r border-white/10">
                    {op.situacao}
                  </td>
                  <td className="px-2 py-1 w-[60px] text-right border-r border-white/10">
                    {op.alav}
                  </td>
                  <td className="px-2 py-1 w-[100px] text-center border-r border-white/10">
                    {op.data}
                  </td>
                  <td className="px-2 py-1 w-[80px] text-center border-r border-white/10">
                    {op.hora}
                  </td>
                  <td className="px-2 py-1 w-[70px] text-center">
                    <button
                      type="button"
                      onClick={() => handleExcluir(op.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExitPanel;
