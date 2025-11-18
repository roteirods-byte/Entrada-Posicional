import React, { useState, useEffect, useCallback } from 'react';
import { EntryData } from '../types';
import { getSwingData, getPosicionalData } from '../api/mock';
import { GoogleGenAI, Type } from '@google/genai';

interface EntryPanelProps {
  coins: string[];
}

const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;

const EntryPanel: React.FC<EntryPanelProps> = ({ coins }) => {
  const [swingData, setSwingData] = useState<EntryData[]>([]);
  const [posicionalData, setPosicionalData] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');

     
    setError('');
    console.log('Atualizando preços...');

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const coinList = coins.join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Para a seguinte lista de criptomoedas: ${coinList}, forneça seus preços atuais em USD. Responda apenas com o objeto JSON especificado no schema, contendo uma lista de objetos, cada um com as chaves "par" (o ticker da moeda) e "preco" (o preço como um número).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    par: { type: Type.STRING },
                    preco: { type: Type.NUMBER },
                  },
                  required: ["par", "preco"],
                },
              },
            },
            required: ["prices"],
          },
        },
      });

      let rawText = response.text.trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.substring(7, rawText.length - 3).trim();
      } else if (rawText.startsWith('```')) {
        rawText = rawText.substring(3, rawText.length - 3).trim();
      }
      
      const jsonResponse = JSON.parse(rawText);

      if (!jsonResponse || !Array.isArray(jsonResponse.prices)) {
        throw new Error("A resposta da API não continha um array 'prices' válido.");
      }
      
      const prices: { par: string; preco: number }[] = jsonResponse.prices;
      
      const priceMap = new Map(prices.map(p => [p.par, p.preco]));

      const updateData = (data: EntryData[]) => {
        return data.map(item => {
          if (priceMap.has(item.par)) {
            return { ...item, preco: priceMap.get(item.par)! };
          }
          return item;
        });
      };
      
      setSwingData(prevData => updateData(prevData));
      setPosicionalData(prevData => updateData(prevData));
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));

    } catch (e) {
      console.error(e);
      let errorMessage = 'Ocorreu um erro desconhecido.';
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      setError(`Falha ao buscar ou processar os preços da API: ${errorMessage}`);
    } finally {
        setLoading(false);
    }
  }, [coins]);

  useEffect(() => {
    const initialSwing = getSwingData().filter(d => coins.includes(d.par));
    const initialPosicional = getPosicionalData().filter(d => coins.includes(d.par));
    setSwingData(initialSwing);
    setPosicionalData(initialPosicional);
    
    fetchAndUpdatePrices();
    const interval = setInterval(fetchAndUpdatePrices, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, [coins, fetchAndUpdatePrices]);


  const renderTable = (title: string, data: EntryData[]) => (
    <div className="w-full">
      <h3 className="text-xl font-bold text-[#ff7b1b] mb-4 text-center">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full bg-[#0b2533] text-sm text-left text-[#e7edf3]">
          <thead className="bg-[#1e3a4c] text-xs uppercase text-[#ff7b1b]">
            <tr>
              <th scope="col" className="px-4 py-3 w-[60px]">PAR</th>
              <th scope="col" className="px-4 py-3 w-[120px]">SINAL</th>
              <th scope="col" className="px-4 py-3 w-[100px]">PREÇO</th>
              <th scope="col" className="px-4 py-3 w-[100px]">ALVO</th>
              <th scope="col" className="px-4 py-3 w-[80px]">GANHO%</th>
              <th scope="col" className="px-4 py-3 w-[80px]">ASSERT%</th>
              <th scope="col" className="px-4 py-3 w-[100px]">DATA</th>
              <th scope="col" className="px-4 py-3 w-[96px]">HORA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr key={index} className="border-t border-gray-700 hover:bg-[#1e3a4c]">
                <td className="px-4 py-2 font-medium whitespace-nowrap">{entry.par}</td>
                <td className={`px-4 py-2 font-bold ${entry.sinal === 'LONG' ? 'text-green-400' : entry.sinal === 'SHORT' ? 'text-red-400' : 'text-gray-400'}`}>{entry.sinal}</td>
                <td className="px-4 py-2 font-semibold text-yellow-300">{entry.preco.toFixed(4)}</td>
                <td className="px-4 py-2">{entry.alvo.toFixed(4)}</td>
                <td className={`px-4 py-2 ${entry.ganho > 0 ? 'text-green-400' : 'text-white'}`}>{entry.ganho.toFixed(2)}</td>
                <td className="px-4 py-2">{entry.assert_pct.toFixed(2)}</td>
                <td className="px-4 py-2">{entry.data}</td>
                <td className="px-4 py-2">{entry.hora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading && swingData.length === 0) {
    return <div className="text-center text-lg text-gray-300">Carregando e buscando preços iniciais...</div>;
  }
  
  // Exibe o erro mas não a tela toda se os dados já foram carregados uma vez
  if (error && swingData.length === 0) {
     return <p className="text-center text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-md mb-4">{error}</p>
  }

  return (
    <div className="w-full">
      {error && <p className="text-center text-red-400 bg-red-900 bg-opacity-30 p-3 rounded-md mb-4">{error}</p>}
      <div className="flex flex-col lg:flex-row gap-8">
        {renderTable('ENTRADA 4H - SWING', swingData)}
        {renderTable('ENTRADA 1H - POSICIONAL', posicionalData)}
      </div>
       {lastUpdated && <p className="text-center text-sm text-gray-400 mt-4">Preços atualizados às: {lastUpdated}</p>}
    </div>
  );
};

export default EntryPanel;
