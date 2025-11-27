// autotrader-painel/components/ExitPanel.tsx
import React, { useEffect, useRef, useState } from 'react';

interface ExitPanelProps {
  coins: string[];
}

type Side = 'LONG' | 'SHORT';
type Mode = 'SWING' | 'POSICIONAL';

// Estrutura da entrada vinda do /api/entrada (mesmo JSON do Painel ENTRADA)
interface EntradaItem {
  par: string;
  modo: Mode;
  preco: number;
  alvo_1: number;
  alvo_2: number;
  alvo_3: number;
}

interface EntradaJson {
  swing: EntradaItem[];
  posicional: EntradaItem[];
}

interface Operation {
  id: number;
  par: string;
  side: Side;
  modo: Mode;
  entrada: number;     // preço de entrada da operação
  alvo_1: number;
  ganho_1_pct: number;
  alvo_2: number;
  ganho_2_pct: number;
  alvo_3: number;
  ganho_3_pct: number;
  situacao: string;     // ABERTA / ALVO 1 / ALVO 2 / ALVO 3
  data: string;
  hora: string;
  alav: number;
}

interface FormState {
  par: string;
  side: Side;
  modo: Mode;
  entrada: string;
  alav: string;
}

const STORAGE_KEY = 'autotrader_exit_ops_v2';

const ExitPanel: React.FC<ExitPanelProps> = ({ coins }) => {
  const [ops, setOps] = useState<Operation[]>([]);
  const [form, setForm] = useState<FormState>({
    par: coins[0] ?? 'AAVE',
    side: 'LONG',
    modo: 'SWING',
    entrada: '',
    alav: '',
  });

  const [entradaData, setEntradaData] = useState<EntradaJson | null>(null);
  const loadedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // 1) CARREGAR / SALVAR OPERAÇÕES NO LOCALSTORAGE (PARA NÃO SUMIR)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Operation[];
        if (Array.isArray(parsed)) {
          setOps(parsed);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar operações do localStorage', e);
    } finally {
      loadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
    } catch (e) {
      console.error('Erro ao salvar operações', e);
    }
  }, [ops]);

  // ---------------------------------------------------------------------------
  // 2) BUSCAR DADOS DO /api/entrada PARA TER PREÇO ATUAL E ALVOS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchEntrada = async () => {
      try {
        const res = await fetch('/api/entrada');
        if (!res.ok) return;
        const data = (await res.json()) as EntradaJson;
        setEntradaData(data);
      } catch (e) {
        console.error('Erro ao buscar /api/entrada', e);
      }
    };

    fetchEntrada();
    const id = setInterval(fetchEntrada, 60_000); // atualiza periodicamente
    return () => clearInterval(id);
  }, []);

  const sortedCoins = [...coins].sort();

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Encontra no JSON de ENTRADA o registro da moeda/modo
  const encontrarEntrada = (par: string, modo: Mode): EntradaItem | undefined => {
    if (!entradaData) return undefined;
    const lista =
      modo === 'SWING' ? entradaData.swing ?? [] : entradaData.posicional ?? [];
    return lista.find((c) => c.par === par);
  };

  // Cálculo de ganho em % entre ENTRADA e ALVO (para LONG/SHORT)
  const calcularGanho = (side: Side, entrada: number, alvo: number): number => {
    if (!entrada || !alvo || entrada <= 0 || alvo <= 0) return 0;
    if (side === 'LONG') {
      return ((alvo - entrada) / entrada) * 100;
    } else {
      return ((entrada - alvo) / entrada) * 100;
    }
  };

  const handleAdd = () => {
    if (!form.par || !form.entrada.trim() || !form.alav.trim()) {
      alert('Preencha PAR, ENTRADA e ALAV.');
      return;
    }

    const entrada = Number(String(form.entrada).replace(',', '.'));
    const alav = Number(String(form.alav).replace(',', '.'));

    if (!Number.isFinite(entrada) || entrada <= 0) {
      alert('Entrada inválida.');
      return;
    }
    if (!Number.isFinite(alav) || alav <= 0) {
      alert('Alavancagem inválida.');
      return;
    }

    // Dados de referência do Painel ENTRADA (preço atual e alvos oficiais)
    const refEntrada = encontrarEntrada(form.par, form.modo);

    const alvo1 = refEntrada?.alvo_1 ?? entrada;
    const alvo2 = refEntrada?.alvo_2 ?? entrada;
    const alvo3 = refEntrada?.alvo_3 ?? entrada;

    const ganho1 = calcularGanho(form.side, entrada, alvo1);
    const ganho2 = calcularGanho(form.side, entrada, alvo2);
    const ganho3 = calcularGanho(form.side, entrada, alvo3);

    const agora = new Date();
    const data = agora.toISOString().slice(0, 10); // AAAA-MM-DD
    const hora = agora.toTimeString().slice(0, 5); // HH:MM

    const novaOp: Operation = {
      id: Date.now(),
      par: form.par,
      side: form.side,
      modo: form.modo,
      entrada,
      alvo_1: alvo1,
      ganho_1_pct: ganho1,
      alvo_2: alvo2,
      ganho_2_pct: ganho2,
      alvo_3: alvo3,
      ganho_3_pct: ganho3,
      situacao: 'ABERTA',
      data,
      hora,
      alav,
    };

    setOps((prev) => [...prev, novaOp]);

    setForm((prev) => ({
      ...prev,
      entrada: '',
      alav: '',
    }));
  };

  const handleDelete = (id: number) => {
    setOps((prev) => prev.filter((op) => op.id !== id));
  };

  // PREÇO ATUAL: pega do JSON de entrada (preço real do mercado)
  const getPrecoAtual = (op: Operation): number => {
    const refEntrada = encontrarEntrada(op.par, op.modo);
    if (refEntrada?.preco && refEntrada.preco > 0) return refEntrada.preco;
    // fallback: se não tiver dado recente, mostra a própria entrada
    return op.entrada;
  };

  const formatNumber = (value: number, decimals = 3) => value.toFixed(decimals);
  const formatPercent = (value: number) => value.toFixed(2);

  // FILTRO POR PAR / SIDE / MODO (como no modelo da planilha)
  const filteredOps = ops.filter(
    (op) =>
      op.par === form.par && op.side === form.side && op.modo === form.modo,
  );

  return (
    <div className="space-y-4">
      {/* Título */}
      <div>
        <h2 className="text-lg font-semibold text-[#ff7b1b] mb-1">
          MONITORAMENTO DE SAÍDA
        </h2>
      </div>

      {/* Barra de filtros / entrada de operação */}
      <div className="bg-[#0b2533] rounded-lg px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#e7edf3]">
          {/* PAR */}
          <select
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#ff7b1b] min-w-[80px]"
            value={form.par}
            onChange={(e) => updateForm('par', e.target.value)}
          >
            {sortedCoins.map((coin) => (
              <option key={coin} value={coin}>
                {coin}
              </option>
            ))}
          </select>

          {/* SIDE */}
          <select
            className={`bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs min-w-[80px] ${
              form.side === 'LONG' ? 'text-green-400' : 'text-red-400'
            }`}
            value={form.side}
            onChange={(e) => updateForm('side', e.target.value as Side)}
          >
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>

          {/* MODO */}
          <select
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] min-w-[90px]"
            value={form.modo}
            onChange={(e) => updateForm('modo', e.target.value as Mode)}
          >
            <option value="SWING">SWING</option>
            <option value="POSICIONAL">POSICIONAL</option>
          </select>

          {/* ENTRADA */}
          <input
            type="text"
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] w-20"
            placeholder="Entrada"
            value={form.entrada}
            onChange={(e) => updateForm('entrada', e.target.value)}
          />

          {/* ALAVANCAGEM */}
          <input
            type="text"
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] w-16"
            placeholder="Alav"
            value={form.alav}
            onChange={(e) => updateForm('alav', e.target.value)}
          />

          {/* BOTÃO ADICIONAR (ALINHADO COM A BARRA) */}
          <button
            onClick={handleAdd}
            className="ml-auto bg-[#ff7b1b] hover:bg-[#ff9b46] text-xs font-semibold text-[#041019] px-3 py-1.5 rounded-md"
          >
            Adicionar Operação
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-[#0b2533] text-xs text-left text-[#e7edf3]">
          <thead className="bg-[#1e3a4c] text-[11px] uppercase text-[#ff7b1b]">
            <tr>
              <th className="px-2 py-2 w-14">PAR</th>
              <th className="px-2 py-2 w-14">SIDE</th>
              <th className="px-2 py-2 w-20">MODO</th>
              <th className="px-2 py-2 w-20 text-right">ENTRADA</th>
              <th className="px-2 py-2 w-20 text-right">PREÇO</th>
              <th className="px-2 py-2 w-20 text-right">ALVO 1 US</th>
              <th className="px-2 py-2 w-18 text-right">GANHO 1%</th>
              <th className="px-2 py-2 w-20 text-right">ALVO 2 US</th>
              <th className="px-2 py-2 w-18 text-right">GANHO 2%</th>
              <th className="px-2 py-2 w-20 text-right">ALVO 3 US</th>
              <th className="px-2 py-2 w-18 text-right">GANHO 3%</th>
              <th className="px-2 py-2 w-24">SITUAÇÃO</th>
              <th className="px-2 py-2 w-14 text-right">ALAV</th>
              <th className="px-2 py-2 w-18">DATA</th>
              <th className="px-2 py-2 w-14">HORA</th>
              <th className="px-2 py-2 w-20 text-center">EXCLUIR</th>
            </tr>
          </thead>
          <tbody>
            {filteredOps.length > 0 ? (
              filteredOps.map((op) => {
                const precoAtual = getPrecoAtual(op);

                return (
                  <tr
                    key={op.id}
                    className="border-t border-[#173446] hover:bg-[#102b3a]"
                  >
                    <td className="px-2 py-1 whitespace-nowrap">{op.par}</td>

                    <td
                      className={`px-2 py-1 whitespace-nowrap font-semibold ${
                        op.side === 'LONG' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {op.side}
                    </td>

                    <td className="px-2 py-1 whitespace-nowrap">{op.modo}</td>

                    <td className="px-2 py-1 text-right">
                      {formatNumber(op.entrada)}
                    </td>

                    <td className="px-2 py-1 text-right">
                      {formatNumber(precoAtual)}
                    </td>

                    <td className="px-2 py-1 text-right">
                      {formatNumber(op.alvo_1)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${
                        op.ganho_1_pct > 0
                          ? 'text-green-400'
                          : op.ganho_1_pct < 0
                          ? 'text-red-400'
                          : ''
                      }`}
                    >
                      {formatPercent(op.ganho_1_pct)}%
                    </td>

                    <td className="px-2 py-1 text-right">
                      {formatNumber(op.alvo_2)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${
                        op.ganho_2_pct > 0
                          ? 'text-green-400'
                          : op.ganho_2_pct < 0
                          ? 'text-red-400'
                          : ''
                      }`}
                    >
                      {formatPercent(op.ganho_2_pct)}%
                    </td>

                    <td className="px-2 py-1 text-right">
                      {formatNumber(op.alvo_3)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right ${
                        op.ganho_3_pct > 0
                          ? 'text-green-400'
                          : op.ganho_3_pct < 0
                          ? 'text-red-400'
                          : ''
                      }`}
                    >
                      {formatPercent(op.ganho_3_pct)}%
                    </td>

                    <td className="px-2 py-1 whitespace-nowrap">
                      {op.situacao}
                    </td>

                    <td className="px-2 py-1 text-right">{op.alav}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{op.data}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{op.hora}</td>

                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => handleDelete(op.id)}
                        className="bg-red-600 hover:bg-red-700 text-[11px] font-semibold text-white px-3 py-1 rounded-md"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-4 text-center text-gray-400"
                >
                  Nenhuma operação cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExitPanel;
