import { EntryData } from '../types';

// Dados de exemplo simples, só para usar se a automação falhar.
// O importante é a estrutura, não os valores.

const swingMock: EntryData[] = [
  {
    par: 'AAVE',
    sinal: 'SHORT',
    preco: 33.008,
    alvo: 0,
    ganho: 0,
    assert_pct: 59.25,
    data: '2025-10-06',
    hora: '16:22',
  },
  {
    par: 'ADA',
    sinal: 'LONG',
    preco: 3.544,
    alvo: 20.647,
    ganho: 2.85,
    assert_pct: 55.64,
    data: '2025-10-06',
    hora: '20:38',
  },
];

const posicionalMock: EntryData[] = [
  {
    par: 'BTC',
    sinal: 'LONG',
    preco: 87000,
    alvo: 90000,
    ganho: 3.0,
    assert_pct: 70,
    data: '2025-10-06',
    hora: '16:30',
  },
];

export function getSwingData(): EntryData[] {
  return swingMock;
}

export function getPosicionalData(): EntryData[] {
  return posicionalMock;
}
