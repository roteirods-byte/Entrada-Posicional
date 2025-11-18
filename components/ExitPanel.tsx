import React, { useEffect, useState } from 'react';

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
  alvo: number;        // mantido só internamente
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

  // Carrega operações salvas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Operation[] = JSON.parse(raw);
        setOps(parsed);
      }
    } catch (e) {
      console.error('Erro ao carregar operações salvas', e);
    }
  }, []);

  // Salva operações sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
    } catch (e) {
      console.error('Erro ao salvar operações', e);
    }
  }, [ops]);

  const updateForm = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!form.par || !form.entrada || !form.alav) {
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
    const alvo = entrada; // alvo interno = entrada (sem coluna nem campo visual)
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

    setOps(prev => [...prev, op]);

    setForm(prev => ({
      ...prev,
      entrada: '',
      alav: '',
    }));
  };

  const handleDelete = (id: number) => {
    setOps(prev => prev.filter(op => op.id !== id));
  };

  const formatNumber = (value: number, decimals = 4) =>
    value.toFixed(decimals);

  const formatPnL = (value: number) => value.toFixed(2);

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-[#ff7b1b] mb-4">
        MONITORAMENTO DE SAÍDA
      </h2>

      {/* BARRA DE DIGITAÇÃO DA OPERAÇÃO (SEM CAMPO ALVO) */}
      <div className="bg-[#0b2533] border border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {/* PAR */}
          <select
            className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3] min-w-[90px]"
            value={form.par}
            onChange={e => updateForm('par', e.target.value)}
          >
            {sortedCoins.map(coin => (
              <option key={coin} value={coin}>
                {coin}
              </option>
            ))}
          </select>

          {/* SIDE - LONG verde, SHORT vermelho */}
          <select
            className={`bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm min-w-[90px] ${
              form.side === 'LONG' ? 'text-green-400' : 'text-red-400'
            }`}
            value={form.side}
            onChange={e =>
              updateForm('side', e.target.value as Side)
            }
          >
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>

          {/* MODO */}
          <select
            className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3] min-w-[110px]"
            value={form.modo}
            onChange={e =>
              updateForm('modo', e.target.value as Mode)
            }
          >
            <option value="SWING">SWING</option>
            <option value="POSICIONAL">POSICIONAL</option>
          </select>

          {/* ENTRADA */}
          <input
            type="number"
            step="0.0001"
            className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3] w-28"
            placeholder="Entrada"
            value={form.entrada}
            onChange={e => updateForm('entrada', e.target.value)}
          />

          {/* ALAVANCAGEM */}
          <input
            type="number"
            step="1"
            className="bg-[#061723] border border-gray-600 rounded-md px-3 py-2 text-sm text-[#e7edf3] w-20"
            placeholder="Alav"
            value={form.alav}
            onChange={e => updateForm('alav', e.target.value)}
          />

          <button
            onClick={handleAdd}
            className="ml-auto bg-[#ff7b1b] hover:bg-[#ff9b46] text-sm font-semibold text-[#041019] px-4 py-2 rounded-md"
          >
            Adicionar Operação
          </button>
        </div>
      </div>

      {/* TABELA (já sem coluna ALVO) */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-[#0b2533] text-sm text-left text-[#e7edf3]">
          <thead className="bg-[#1e3a4c] text-xs uppercase text-[#ff7b1b]">
            <tr>
              <th className="px-4 py-3">PAR</th>
              <th className="px-4 py-3">SIDE</th>
              <th className="px-4 py-3">MODO</th>
              <th className="px-4 py-3">ENTRADA</th>
              <th className="px-4 py-3">PREÇO ATUAL</th>
              <th className="px-4 py-3">PNL%</th>
              <th className="px-4 py-3">SITUAÇÃO</th>
              <th className="px-4 py-3">DATA</th>
              <th className="px-4 py-3">HORA</th>
              <th className="px-4 py-3">ALAV</th>
              <th className="px-4 py-3 text-center">EXCLUIR</th>
            </tr>
          </thead>
          <tbody>
            {ops.map(op => (
              <tr
                key={op.id}
                className="border-t border-gray-700 hover:bg-[#1e3a4c]"
              >
                <td className="px-4 py-2 font-medium whitespace-nowrap">
                  {op.par}
                </td>
                <td
                  className={`px-4 py-2 font-bold whitespace-nowrap ${
                    op.side === 'LONG'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {op.side}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {op.modo}
                </td>
                <td className="px-4 py-2">
                  {formatNumber(op.entrada)}
                </td>
                <td className="px-4 py-2">
                  {formatNumber(op.precoAtual)}
                </td>
                <td
                  className={`px-4 py-2 font-semibold ${
                    op.pnlPct > 0
                      ? 'text-green-400'
                      : op.pnlPct < 0
                      ? 'text-red-400'
                      : ''
                  }`}
                >
                  {formatPnL(op.pnlPct)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {op.situacao}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {op.data}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {op.hora}
                </td>
                <td className="px-4 py-2">{op.alav}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(op.id)}
                    className="bg-red-600 hover:bg-red-700 text-xs font-semibold text-white px-3 py-1 rounded-md"
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
