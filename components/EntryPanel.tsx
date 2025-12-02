import React, { useEffect, useState } from "react";

type EntradaRegistro = {
  par: string;
  modo: "SWING" | "POSICIONAL";
  sinal: "LONG" | "SHORT" | "NAO_ENTRAR";
  preco: number;
  alvo: number;
  ganho_pct: number;
  assert_pct: number;
  data: string; // "YYYY-MM-DD"
  hora: string; // "HH:MM"
};

type EntradaResponse = {
  swing: EntradaRegistro[];
  posicional: EntradaRegistro[];
};

const MIN_ASSERT_PCT = 65.0;

function sortByPar(list: EntradaRegistro[]): EntradaRegistro[] {
  return [...list].sort((a, b) => a.par.localeCompare(b.par));
}

function classNameSide(sinal: EntradaRegistro["sinal"]): string {
  if (sinal === "LONG") return "text-green-400 font-semibold";
  if (sinal === "SHORT") return "text-red-400 font-semibold";
  return "text-gray-300 font-semibold"; // NAO_ENTRAR
}

function classNameGanho(ganho: number): string {
  if (ganho > 0) return "text-green-400";
  if (ganho < 0) return "text-red-400";
  return "text-gray-200";
}

function classNameAssert(assert_pct: number): string {
  if (assert_pct >= MIN_ASSERT_PCT) return "text-green-400";
  return "text-red-400";
}

interface TabelaProps {
  titulo: string;
  registros: EntradaRegistro[];
}

const TabelaModo: React.FC<TabelaProps> = ({ titulo, registros }) => {
  const ordenados = sortByPar(registros);

  return (
    <div className="flex-1 bg-slate-900 rounded-xl p-4 shadow-md m-2">
      <h2 className="text-xl font-bold text-orange-400 mb-3 text-center">
        {titulo}
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-2 py-1 text-left text-orange-300">PAR</th>
              <th className="px-2 py-1 text-left text-orange-300">SIDE</th>
              <th className="px-2 py-1 text-right text-orange-300">PREÇO</th>
              <th className="px-2 py-1 text-right text-orange-300">ALVO</th>
              <th className="px-2 py-1 text-right text-orange-300">GANHO %</th>
              <th className="px-2 py-1 text-right text-orange-300">ASSERT %</th>
              <th className="px-2 py-1 text-center text-orange-300">DATA</th>
              <th className="px-2 py-1 text-center text-orange-300">HORA</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((row) => (
              <tr key={`${titulo}-${row.par}`} className="border-b border-slate-700">
                <td className="px-2 py-1">{row.par}</td>
                <td className={`px-2 py-1 ${classNameSide(row.sinal)}`}>
                  {row.sinal}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.preco.toFixed(3)}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.alvo.toFixed(3)}
                </td>
                <td className={`px-2 py-1 text-right ${classNameGanho(row.ganho_pct)}`}>
                  {row.ganho_pct.toFixed(2)}
                </td>
                <td className={`px-2 py-1 text-right ${classNameAssert(row.assert_pct)}`}>
                  {row.assert_pct.toFixed(2)}
                </td>
                <td className="px-2 py-1 text-center">{row.data}</td>
                <td className="px-2 py-1 text-center">{row.hora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EntryPanel: React.FC = () => {
  const [data, setData] = useState<EntradaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro(null);
        const resp = await fetch("/api/entrada");
        if (!resp.ok) {
          throw new Error("Erro ao buscar /api/entrada");
        }
        const json = (await resp.json()) as EntradaResponse;
        setData(json);
      } catch (e: any) {
        console.error(e);
        setErro("Falha ao carregar dados de entrada.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
    const id = setInterval(carregar, 60_000); // atualiza a cada 60s
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl p-4 text-white">
        Carregando dados de entrada...
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className="bg-slate-900 rounded-xl p-4 text-red-400">
        {erro ?? "Sem dados para exibir."}
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-2xl p-4 text-white">
      <h1 className="text-2xl font-bold text-orange-400 mb-4 text-center">
        Painel de Entrada
      </h1>

      <div className="flex flex-col lg:flex-row">
        <TabelaModo titulo="SWING (4H)" registros={data.swing || []} />
        <TabelaModo titulo="POSICIONAL (1D)" registros={data.posicional || []} />
      </div>
    </div>
  );
};

export default EntryPanel;
