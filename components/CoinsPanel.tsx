import React, { useState, useEffect } from 'react';

interface CoinsPanelProps {
  coins: string[];
  setCoins: (coins: string[]) => void;
}

const STORAGE_KEY = 'autotrader_coins_v1';

const CoinsPanel: React.FC<CoinsPanelProps> = ({ coins, setCoins }) => {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Carregar do localStorage (uma vez)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((c) => typeof c === 'string')) {
        const cleaned = [...new Set(
          parsed.map((c) => c.toUpperCase().trim()).filter(Boolean)
        )].sort();
        if (cleaned.length > 0) {
          setCoins(cleaned);
        }
      }
    } catch {
      // Ignora erro de parse
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvar sempre que as moedas mudarem
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coins));
  }, [coins]);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = () => {
    if (!input.trim()) {
      showMessage('Digite pelo menos uma moeda.');
      return;
    }

    const parts = input
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    if (parts.length === 0) {
      showMessage('Entrada inválida.');
      return;
    }

    const updated = Array.from(new Set([...coins, ...parts])).sort();
    setCoins(updated);
    setInput('');
    setSelected([]);
    showMessage(`${parts.length} moeda(s) adicionada(s).`);
  };

  const toggleSelected = (coin: string) => {
    setSelected((prev) =>
      prev.includes(coin) ? prev.filter((c) => c !== coin) : [...prev, coin]
    );
  };

  const handleRemoveSelected = () => {
    if (selected.length === 0) {
      showMessage('Nenhuma moeda selecionada.');
      return;
    }
    const updated = coins.filter((c) => !selected.includes(c));
    setCoins(updated);
    setSelected([]);
    showMessage(`${selected.length} moeda(s) removida(s).`);
  };

  return (
    <section className="w-full max-w-4xl mx-auto">
      <div className="bg-[#05202f] border border-[#12354a] rounded-2xl shadow-lg px-6 py-6">
        <h2 className="text-2xl font-bold text-[#ff7b1b] mb-4">
          PAINEL DE MOEDAS
        </h2>

        {/* Linha de entrada de novas moedas */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-medium text-[#ff7b1b]">Nova(s):</span>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ex.: BTC, ETH, SOL"
            className="w-64 sm:w-72 rounded-md border border-[#25546a] bg-[#061824] px-3 py-2 text-sm text-[#e7edf3] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff7b1b]"
          />

          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-[#ff7b1b] text-[#061824] hover:bg-[#ffa64d] transition-colors"
          >
            Adicionar
          </button>
        </div>

        {message && (
          <p className="mb-3 text-sm text-[#0fd56a] bg-[#07311f] bg-opacity-70 rounded-md px-3 py-2">
            {message}
          </p>
        )}

        {/* Caixa da lista de moedas */}
        <div className="rounded-xl border border-[#12354a] bg-[#020814] px-4 py-3">
          <div className="max-h-64 overflow-y-auto pr-2">
            <ul className="space-y-1 text-sm text-[#e7edf3]">
              {coins.map((coin) => (
                <li key={coin} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`coin-${coin}`}
                    checked={selected.includes(coin)}
                    onChange={() => toggleSelected(coin)}
                    className="h-4 w-4 rounded border-gray-500 bg-[#061824]"
                  />
                  <label htmlFor={`coin-${coin}`} className="cursor-pointer">
                    {coin}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#e7edf3]">
            <span>
              Total:{' '}
              <span className="font-semibold text-[#ff7b1b]">
                {coins.length}
              </span>{' '}
              pares (ordem alfabética)
            </span>
            <button
              type="button"
              onClick={handleRemoveSelected}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-[#b91c1c] text-white hover:bg-[#dc2626] transition-colors disabled:opacity-60"
            >
              Remover selecionadas
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoinsPanel;
