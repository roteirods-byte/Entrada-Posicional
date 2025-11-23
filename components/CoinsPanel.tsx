import React, { useMemo, useState } from 'react';

interface CoinsPanelProps {
  coins: string[];
  setCoins: (coins: string[]) => void;
}

const CoinsPanel: React.FC<CoinsPanelProps> = ({ coins, setCoins }) => {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  // mantém sempre em ordem alfabética
  const sortedCoins = useMemo(
    () => [...coins].sort((a, b) => a.localeCompare(b)),
    [coins]
  );

  const handleAdd = () => {
    if (!input.trim()) return;

    const newCoins = input
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    if (newCoins.length === 0) return;

    const merged = Array.from(new Set([...coins, ...newCoins])).sort((a, b) =>
      a.localeCompare(b)
    );
    setCoins(merged);
    setInput('');
  };

  const toggleSelect = (coin: string) => {
    setSelected((prev) =>
      prev.includes(coin) ? prev.filter((c) => c !== coin) : [...prev, coin]
    );
  };

  const handleRemove = () => {
    if (selected.length === 0) return;
    const remaining = coins.filter((c) => !selected.includes(c));
    setCoins(remaining);
    setSelected([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[#ff7b1b] mb-6">
        PAINEL DE MOEDAS
      </h2>

      <div className="bg-[#082432] border border-[#12384d] rounded-xl px-6 py-6">
        {/* Linha de entrada + botão Adicionar */}
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#ff7b1b] mb-1">
              Nova(s):
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ex.: BTC, ETH, SOL"
              className="w-32 h-9 px-3 rounded-md bg-[#02131f] border border-[#2c4f63] text-sm text-[#e7edf3] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="h-9 px-6 text-sm font-semibold rounded-md border border-[#ff7b1b] text-[#ff7b1b] bg-[#082432] hover:bg-[#ff7b1b]/10 transition-colors"
          >
            Adicionar
          </button>
        </div>

        {/* Botão Remover embaixo do Adicionar */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleRemove}
            disabled={selected.length === 0}
            className="h-9 px-6 text-sm font-semibold rounded-md border border-[#ff7b1b] text-[#ff7b1b] bg-[#082432] hover:bg-[#ff7b1b]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Remover selecionadas
          </button>
        </div>

        {/* Lista de moedas */}
        <div className="flex flex-col">
          <div className="w-32 h-36 overflow-y-auto bg-[#02131f] border border-[#ff7b1b] rounded-md px-3 py-2 space-y-1">
            {sortedCoins.map((coin) => (
              <label
                key={coin}
                className="flex items-center gap-2 text-sm text-[#e7edf3]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(coin)}
                  onChange={() => toggleSelect(coin)}
                  className="accent-[#ff7b1b]"
                />
                <span className="text-[#ff7b1b]">{coin}</span>
              </label>
            ))}
          </div>

          <span className="mt-2 text-xs text-[#ff7b1b]">
            Total: {sortedCoins.length} pares (ordem alfabética)
          </span>
        </div>
      </div>
    </div>
  );
};

export default CoinsPanel;
