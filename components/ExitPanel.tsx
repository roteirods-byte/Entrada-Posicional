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
  alvo: number; // usado só internamente
  precoAtual: number;
  pnlPct: number;
  situacao: 'ABERTA' | 'FECHADA';
  data: string;
  hora: string;
  alav: number;
}

const STORAGE_KEY = 'autotrader_exit_ops_v1';

interface FormState {
  par: string;
  side: Side;
  modo: Mode;
  entrada: string;
  alav: string;
}

const ExitPanel: React.FC<ExitPanelProps> = ({ coins }) => {
  const sortedCoins = [...coins].sort();

  const [ops, setOps] = useState<Operation[]>([]);
  const [form, setForm] = useState<FormState>({
    par: sortedCoins[0] ?? '',
    side: 'LONG',
    modo: 'SWING',
    entrada: '',
    alav: '',
  });

  // controla se já carregou do storage
  const loadedRef = useRef(false);

  // Carrega operações salvas (uma vez)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Operation[] = JSON.parse(raw);
        setOps(parsed);
      }
    } catch (e) {
      console.error('Erro ao carregar operações salvas', e);
    } finally {
      loadedRef.current = true;
    }
  }, []);

  // Salva operações somente depois de ter carregado
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
    } catch (e) {
      console.error('Erro ao salvar operações', e);
    }
  }, [ops]);

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!form.par || !form.entrada.trim() || !form.alav.trim()) {
      alert('Preencha pelo menos PAR, ENTRADA e ALAV.');
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

    const now = new Date();
    const data = now.toISOString().slice(0, 10);
    const hora = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const precoAtual = entrada;
    const alvo = entrada;
    const pnlPct = 0;

    const op: Operation = {
      id: Date.now(),
      par: form.par,
      side: form.side,
      modo: form.modo,
      entrada,
      alvo,
      precoAtual,
      pnlPct,
      situacao: 'ABERTA',
      data,
      hora,
      alav,
    };

    setOps((prev) => [...prev, op]);

    setForm((prev) => ({
      ...prev,
      entrada: '',
      alav: '',
    }));
  };

  const handleDelete = (id: number) => {
    setOps((prev) => prev.filter((op) => op.id !== id));
  };

  const formatNumber = (value: number, decimals = 4) =>
    value.toFixed(decimals);

  const formatPnL = (value: number) => value.toFixed(2);

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-[#ff7b1b] mb-4">
        MONITORAMENTO DE SAÍDA
      </h2>

      {/* BARRA DE DIGITAÇÃO DA OPERAÇÃO */}
      <div className="bg-[#0b2533] border border-gray-700 rounded-lg p-3 mb-5">
        <div className="flex flex-wrap gap-2 items-center">
          {/* PAR */}
          <select
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] min-w-[80px]"
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
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] min-w-[90px]"
            value={form.modo}
            onChange={(e) => updateForm('modo', e.target.value as Mode)}
          >
            <option value="SWING">SWING</option>
            <option value="POSICIONAL">POSICIONAL</option>
          </select>

          {/* ENTRADA (sem setas, texto) */}
          <input
            type="text"
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] w-24"
            placeholder="Entrada"
            value={form.entrada}
            onChange={(e) => updateForm('entrada', e.target.value)}
          />

          {/* ALAVANCAGEM (sem setas, texto) */}
          <input
            type="text"
            className="bg-[#061723] border border-gray-600 rounded-md px-2 py-1 text-xs text-[#e7edf3] w-16"
            placeholder="Alav"
            value={form.alav}
            onChange={(e) => updateForm('alav', e.target.value)}
          />

          <button
            onClick={handleAdd}
            className="ml-auto bg-[#ff7b1b] hover:bg-[#ff9b46] text-xs font-semibold text-[#041019] px-3 py-1.5 rounded-md"
          >
            Adicionar Operação
          </button>
        </div>
      </div>

      {/* TABELA (colunas mais estreitas) */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-[#0b2533] text-xs text-left text-[#e7edf3]">
          <thead className="bg-[#1e3a4c] text-[11px] uppercase text-[#ff7b1b]">
            <tr>
              <th className="px-2 py-2 w-20">PAR</th>
              <th className="px-2 py-2 w-16">SIDE</th>
              <th className="px-2 py-2 w-24">MODO</th>
              <th className="px-2 py-2 w-24 text-right">ENTRADA</th>
              <th className="px-2 py-2 w-28 text-right">PREÇO ATUAL</th>
              <th className="px-2 py-2 w-20 text-right">PNL%</th>
              <th className="px-2 py-2 w-24">SITUAÇÃO</th>
              <th className="px-2 py-2 w-24">DATA</th>
              <th className="px-2 py-2 w-20">HORA</th>
              <th className="px-2 py-2 w-16 text-right">ALAV</th>
              <th className="px-2 py-2 w-20 text-center">EXCLUIR</th>
            </tr>
          </thead>
          <tbody>
            {ops.map((op) => (
              <tr
                key={op.id}
                className="border-t border-gray-700 hover:bg-[#1e3a4c]"
              >
                <td className="px-2 py-1 font-medium whitespace-nowrap">
                  {op.par}
                </td>
                <td
                  className={`px-2 py-1 font-bold whitespace-nowrap ${
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
                  {formatNumber(op.precoAtual)}
                </td>
                <td
                  className={`px-2 py-1 text-right font-semibold ${
                    op.pnlPct > 0
                      ? 'text-green-400'
                      : op.pnlPct < 0
                      ? 'text-red-400'
                      : ''
                  }`}
                >
                  {formatPnL(op.pnlPct)}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  {op.situacao}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">{op.data}</td>
                <td className="px-2 py-1 whitespace-nowrap">{op.hora}</td>
                <td className="px-2 py-1 text-right">{op.alav}</td>
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => handleDelete(op.id)}
                    className="bg-red-600 hover:bg-red-700 text-[11px] font-semibold text-white px-3 py-1 rounded-md"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {ops.length === 0 && (
              <tr>
                <td
                  colSpan={11}
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
