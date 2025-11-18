// src/components/ExitPanel.tsx
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
  alvo: number;
  precoAtual: number;
  pnlPct: number;
  situacao: 'ABERTA' | 'FECHADA';
  data: string;
  hora: string;
  alav: number;
}

const STORAGE_KEY = 'autotrader_exit_ops_v1';

const ExitPanel: React.FC<ExitPanelProps> = ({ coins }) => {
  const [ops, setOps] = useState<Operation[]>([]);
  const [form, setForm] = useState({
    par: coins[0] ?? '',
    side: 'LONG' as Side,
    modo: 'SWING' as Mode,
    entrada: '',
    alvo: '',
    alav: '',
  });

  // Carrega operações salvas (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Operation[] = JSON.parse(raw);
        setOps(parsed);
      }
    } catch (e) {
      console.error('Erro ao ler operações salvas', e);
    }
  }, []);

  // Salva sempre que mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  }, [ops]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const calcularPnl = (side: Side, entrada: number, precoAtual: number, alav: number) => {
    if (!entrada || !precoAtual || !alav) return 0;
    const bruto =
      side === 'LONG'
        ? (precoAtual - entrada) / entrada
        : (entrada - precoAtual) / entrada;
    return +(bruto * alav * 100).toFixed(2);
  };

  const handleAdd = () => {
    const entrada = parseFloat(form.entrada.replace(',', '.'));
    const alvo = parseFloat(form.alvo.replace(',', '.'));
    const alav = parseFloat(form.alav.replace(',', '.'));

    if (!form.par || isNaN(entrada) || isNaN(alvo) || isNaN(alav)) {
      alert('Preencha PAR, Entrada, Alvo e Alav.');
      return;
    }

    const now = new Date();
    const data = now.toISOString().slice(0, 10);
    const hora = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Ainda não temos feed de preço: começa com preço atual = entrada
    const precoAtual = entrada;
    const pnlPct = calcularPnl(form.side, entrada, precoAtual, alav);

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
    setForm(prev => ({ ...prev, entrada: '', alvo: '', alav: '' }));
  };

  const handleDelete = (id: number) => {
    setOps(prev => prev.filter(op => op.id !== id));
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-[#ff7b1b] mb-4">
        MONITORAMENTO DE SAÍDA
      </h2>

      {/* LINHA DE CADASTRO (sem GANHO / STOP) */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* PAR */}
        <select
          value={form.par}
          onChange={e => handleChange('par', e.target.value)}
          className="min-w-[100px] px-3 py-2 rounded-md bg-[#0b2533] border border-gray-600 text-[#e7edf3] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
        >
          {coins.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* SIDE (LONG verde, SHORT vermelho) */}
        <select
          value={form.side}
          onChange={e => handleChange('side', e.target.value as Side)}
          className={`min-w-[110px] px-3 py-2 rounded-md bg-[#0b2533] border border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#ff7b1b] ${
            form.side === 'LONG' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>

        {/* MODO */}
        <select
          value={form.modo}
          onChange={e => handleChange('modo', e.target.value as Mode)}
          className="min-w-[130px] px-3 py-2 rounded-md bg-[#0b2533] border border-gray-600 text-[#e7edf3] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
        >
          <option value="SWING">SWING</option>
          <option value="POSICIONAL">POSICIONAL</option>
        </select>

        {/* ENTRADA */}
        <input
          type="number"
          step="0.0001"
          placeholder="Entrada"
          value={form.entrada}
          onChange={e => handleChange('entrada', e.target.value)}
          className="w-24 px-3 py-2 rounded-md bg-[#0b2533] border border-gray-600 text-[#e7edf3] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
        />

        {/* ALVO */}
        <input
          type="number"
          step="0.0001"
          placeholder="Alvo"
          value={form.alvo}
          onChange={e => handleChange('alvo', e.target.value)}
          className="w-24 px-3 py-2 rounded-md bg-[#0b2533] border border-gray-600 text-[#e7edf3] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
        />

        {/* ALAVANCAGEM */}
        <input
          type="number"
          step="1"
          placeholder="Alav"
          value={form.alav}
          onChange={e => handleChange('alav', e.target.value)}
          className="w-20 px-3 py-2 rounded-md bg-[#0b2533] border border-gray-600 text-[#e7edf3] focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
        />

        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-md bg-[#ff7b1b] text-[#0b2533] font-semibold hover:bg-[#ffa74d] transition-colors"
        >
          Adicionar Operação
        </button>
      </div>

      {/* TABELA (sem colunas GANHO / STOP) */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-[#0b2533] text-sm text-left text-[#e7edf3]">
          <thead className="bg-[#1e3a4c] text-xs uppercase text-[#ff7b1b]">
            <tr>
              <th className="px-4 py-3">PAR</th>
              <th className="px-4 py-3">SIDE</th>
              <th className="px-4 py-3">MODO</th>
              <th className="px-4 py-3">ENTRADA</th>
              <th className="px-4 py-3">ALVO</th>
              <th className="px-4 py-3">PREÇO ATUAL</th>
              <th className="px-4 py-3">PNL%</th>
              <th className="px-4 py-3">SITUAÇÃO</th>
              <th className="px-4 py-3">DATA</th>
              <th className="px-4 py-3">HORA</th>
              <th className="px-4 py-3">ALAV</th>
              <th className="px-4 py-3">EXCLUIR</th>
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

                {/* SIDE colorido */}
                <td
                  className={`px-4 py-2 font-bold ${
                    op.side === 'LONG' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {op.side}
                </td>

                <td className="px-4 py-2">{op.modo}</td>
                <td className="px-4 py-2">{op.entrada.toFixed(4)}</td>
                <td className="px-4 py-2">{op.alvo.toFixed(4)}</td>
                <td className="px-4 py-2">{op.precoAtual.toFixed(4)}</td>

                {/* PNL% verde se > 0, vermelho se < 0 */}
                <td
                  className={`px-4 py-2 font-semibold ${
                    op.pnlPct > 0
                      ? 'text-green-400'
                      : op.pnlPct < 0
                      ? 'text-red-400'
                      : ''
                  }`}
                >
                  {op.pnlPct.toFixed(2)}
                </td>

                <td className="px-4 py-2">{op.situacao}</td>
                <td className="px-4 py-2">{op.data}</td>
                <td className="px-4 py-2">{op.hora}</td>
                <td className="px-4 py-2">{op.alav}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDelete(op.id)}
                    className="px-3 py-1 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}

            {ops.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-4 text-center text-sm text-gray-400"
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
