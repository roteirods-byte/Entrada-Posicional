import React, { useEffect, useRef, useState } from 'react';

interface ExitPanelProps {
  coins: string[];
}

type Side = 'LONG' | 'SHORT';
type Mode = 'SWING' | 'POSICIONAL';

interface Operation {
  id: number;
  par: string;
  side: Side;
  modo: Mode;
  entrada: number;
  preco: number;
  alvo_1: number;
  ganho_1_pct: number;
  alvo_2: number;
  ganho_2_pct: number;
  alvo_3: number;
  ganho_3_pct: number;
  situacao: string; // ABERTA / ALVO 1 / ALVO 2 / ALVO 3
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

// Resposta do /api/entrada (simplificada)
interface EntradaItem {
  par: string;
  modo: Mode;
  preco: number;
}

interface EntradaResponse {
  swing?: EntradaItem[];
  posicional?: EntradaItem[];
}

type PriceMap = Record<string, number>;

const STORAGE_KEY = 'autotrader_exit_ops_v2';
const ENTRADA_API_URL = '/api/entrada';

const ExitPanel: React.FC<ExitPanelProps> = ({ coins }) => {
  const [ops, setOps] = useState<Operation[]>([]);
  const [form, setForm] = useState<FormState>({
    par: coins[0] ?? 'AAVE',
    side: 'LONG',
    modo: 'SWING',
    entrada: '',
    alav: '',
  });

  // mapa com o preço atual por (modo + par), vindo do painel ENTRADA
  const [priceMap, setPriceMap] = useState<PriceMap>({});
  const loadedRef = useRef(false);

  // -----------------------------
  // 1) Carregar / salvar operações no localStorage
  // -----------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        if (Array.isArray(parsed)) {
          const normalizado: Operation[] = parsed.map((op, idx) => ({
            id: typeof op.id === 'number' ? op.id : Date.now() + idx,
            par: String(op.par ?? 'AAVE').toUpperCase(),
            side: op.side === 'SHORT' ? 'SHORT' : 'LONG',
            modo: op.modo === 'POSICIONAL' ? 'POSICIONAL' : 'SWING',
            entrada: Number(op.entrada ?? 0),
            preco: Number(op.preco ?? op.entrada ?? 0),
            alvo_1: Number(op.alvo_1 ?? op.entrada ?? 0),
            ganho_1_pct: Number(op.ganho_1_pct ?? 0),
            alvo_2: Number(op.alvo_2 ?? op.entrada ?? 0),
            ganho_2_pct: Number(op.ganho_2_pct ?? 0),
            alvo_3: Number(op.alvo_3 ?? op.entrada ?? 0),
            ganho_3_pct: Number(op.ganho_3_pct ?? 0),
            situacao: String(op.situacao ?? 'ABERTA'),
            data: String(op.data ?? ''),
            hora: String(op.hora ?? ''),
            alav: Number(op.alav ?? 1),
          }));
          setOps(normalizado);
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

  // -----------------------------
  // 2) Buscar PREÇO real do painel ENTRADA (/api/entrada)
  // -----------------------------
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(ENTRADA_API_URL);
        if (!res.ok) return;

        const data: EntradaResponse = await res.json();
        const map: PriceMap = {};

        const addArray = (arr?: EntradaItem[]) => {
          if (!Array.isArray(arr)) return;
          arr.forEach((item) => {
            const key = `${item.modo}-${item.par}`.toUpperCase();
            map[key] = Number(item.preco ?? 0);
          });
        };

        addArray(data.swing);
        addArray(data.posicional);

        setPriceMap(map);
      } catch (e) {
        console.error('Erro ao buscar preços atuais de entrada', e);
      }
    };

    fetchPrices();
    const id = setInterval(fetchPrices, 60_000); // atualiza a cada 60s
    return () => clearInterval(id);
  }, []);

  const sortedCoins = [...coins].sort();

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const agora = new Date();
    const data = agora.toISOString().slice(0, 10); // AAAA-MM-DD
    const hora = agora.toTimeString().slice(0, 5); // HH:MM

    const key = `${form.modo}-${form.par}`.toUpperCase();
    const precoAtual = priceMap[key] ?? entrada;

    const novaOp: Operation = {
      id: Date.now(),
      par: form.par,
      side: form.side,
      modo: form.modo,
      entrada,
      preco: precoAtual,
      // por enquanto os alvos são iguais à entrada;
      // ganhos ficam 0 até integrar com worker_saida.
      alvo_1: entrada,
      ganho_1_pct: 0,
      alvo_2: entrada,
      ganho_2_pct: 0,
      alvo_3: entrada,
      ganho_3_pct: 0,
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

  const formatNumber = (value: number, decimals = 3) =>
    Number.isFinite(value) ? value.toFixed(decimals) : '0.000';

  const formatPercent = (value: number) =>
    Number.isFinite(value) ? value.toFixed(2) : '0.00';

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
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs min-w-[80px] text-[#ff7b1b]"
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
            className={`bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs min-w-[70px] ${
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
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] min-w-[95px]"
            value={form.modo}
            onChange={(e) => updateForm('modo', e.target.value as Mode)}
          >
            <option value="SWING">SWING</option>
            <option value="POSICIONAL">POSICIONAL</option>
          </select>

          {/* ENTRADA */}
          <input
            type="text"
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] w-24"
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

          {/* Botão adicionar grudado na barra */}
          <button
            onClick={handleAdd}
            className="bg-[#ff7b1b] hover:bg-[#ff9b46] text-xs font-semibold text-[#041019] px-3 py-1.5 rounded-md"
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
              <th className="px-2 py-2 w-24 text-right">ENTRADA</th>
              <th className="px-2 py-2 w-24 text-right">PREÇO</th>
              <th className="px-2 py-2 w-24 text-right">ALVO 1 US</th>
              <th className="px-2 py-2 w-20 text-right">GANHO 1%</th>
              <th className="px-2 py-2 w-24 text-right">ALVO 2 US</th>
              <th className="px-2 py-2 w-20 text-right">GANHO 2%</th>
              <th className="px-2 py-2 w-24 text-right">ALVO 3 US</th>
              <th className="px-2 py-2 w-20 text-right">GANHO 3%</th>
              <th className="px-2 py-2 w-24">SITUAÇÃO</th>
              <th className="px-2 py-2 w-14 text-right">ALAV</th>
              <th className="px-2 py-2 w-20">DATA</th>
              <th className="px-2 py-2 w-16">HORA</th>
              <th className="px-2 py-2 w-20 text-center">EXCLUIR</th>
            </tr>
          </thead>
          <tbody>
            {ops.length > 0 ? (
              ops.map((op) => {
                const key = `${op.modo}-${op.par}`.toUpperCase();
                const precoAtual = priceMap[key] ?? op.preco;

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
