#!/usr/bin/env python3
# worker_entrada.py
#
# Gera o arquivo data/entrada.json para o painel de ENTRADA:
# - Usa MOEDAS_OFICIAIS do config_autotrader.py (50 moedas).
# - Calcula ALVO a partir do histórico (função adaptativa simples).
# - GANHO % SEMPRE POSITIVO: distância entre preço real e alvo.
# - Filtro de 3% decide LONG / SHORT / NAO_ENTRAR.
# - Apenas POSICIONAL (1d). SWING desligado neste worker.

import json
import time
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

import ccxt  # mesmas corretoras de antes (KuCoin, Gate.io, OKX)

from config_autotrader import (
    MOEDAS_OFICIAIS,
    GANHO_MINIMO_PCT,
    GANHO_MAXIMO_PCT,
)

# ==========================
# CONFIGURAÇÕES BÁSICAS
# ==========================

COINS = MOEDAS_OFICIAIS

TIMEFRAME_POSICIONAL = "1d"
LOOKBACK_CANDLES = 120  # histórico


# ==========================
# EXCHANGES
# ==========================


def criar_exchanges():
    print("[exchanges] Criando conexões com KuCoin, Gate.io e OKX...")

    kucoin = ccxt.kucoin({"enableRateLimit": True})
    gate = ccxt.gateio({"enableRateLimit": True})
    okx = ccxt.okx({"enableRateLimit": True})

    return {
        "kucoin": kucoin,
        "gate": gate,
        "okx": okx,
    }


def get_ohlcv_multi(exchanges, symbol, timeframe, limit=LOOKBACK_CANDLES):
    all_ohlcv = []
    last_error = None

    for name, ex in exchanges.items():
        try:
            print(f"[ohlcv] {symbol} {timeframe} em {name}...")
            ohlcv = ex.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
            if ohlcv:
                all_ohlcv.append(ohlcv)
        except Exception as e:
            last_error = e
            print(f"[ohlcv] Erro em {name}: {e}")

    if not all_ohlcv:
        raise RuntimeError(f"Falha OHLCV em todas as corretoras: {last_error}")

    min_len = min(len(x) for x in all_ohlcv)
    all_ohlcv = [x[-min_len:] for x in all_ohlcv]

    agregados = []
    for i in range(min_len):
        candles = [ex[i] for ex in all_ohlcv]
        ts = candles[0][0]
        opens = [c[1] for c in candles]
        highs = [c[2] for c in candles]
        lows = [c[3] for c in candles]
        closes = [c[4] for c in candles]
        volumes = [c[5] for c in candles]

        agregados.append([
            ts,
            sum(opens) / len(opens),
            sum(highs) / len(highs),
            sum(lows) / len(lows),
            sum(closes) / len(closes),
            sum(volumes) / len(volumes),
        ])

    return agregados


def get_price_live(exchanges, symbol):
    prices = []
    last_error = None

    for name, ex in exchanges.items():
        try:
            print(f"[ticker] {symbol} em {name}...")
            ticker = ex.fetch_ticker(symbol)
            price = ticker.get("last") or ticker.get("close")
            if price:
                prices.append(price)
        except Exception as e:
            last_error = e
            print(f"[ticker] Erro em {name}: {e}")

    if not prices:
        raise RuntimeError(f"Falha ticker em todas as corretoras: {last_error}")

    return sum(prices) / len(prices)


# ==========================
# CÁLCULOS
# ==========================


def calc_atr(ohlcv, period=14):
    if len(ohlcv) < period + 1:
        raise ValueError("Poucos candles para ATR.")

    trs = []
    for i in range(1, len(ohlcv)):
        _, _, high, low, close, _ = ohlcv[i]
        _, _, _, _, prev_close, _ = ohlcv[i - 1]

        tr = max(
            high - low,
            abs(high - prev_close),
            abs(low - prev_close),
        )
        trs.append(tr)

    trs = trs[-period:]
    atr = sum(trs) / len(trs)
    return atr


def detectar_tendencia(closes):
    if len(closes) < 20:
        return "NAO_ENTRAR"

    mid = len(closes) // 2
    media_inicial = sum(closes[:mid]) / mid
    media_final = sum(closes[mid:]) / (len(closes) - mid)

    if media_final > media_inicial * 1.01:
        return "LONG"
    elif media_final < media_inicial * 0.99:
        return "SHORT"
    else:
        return "NAO_ENTRAR"


def escolher_alvo_estatistico_adaptativo(ohlcv, atr, side, preco_live):
    if side == "LONG":
        alvo = preco_live + 1.5 * atr
    elif side == "SHORT":
        alvo = preco_live - 1.5 * atr
    else:
        alvo = preco_live
    return alvo


def calcular_assertividade(preco_live, alvo, atr):
    if atr <= 0:
        return 60.0

    distancia_atr = abs(alvo - preco_live) / atr

    if 1.0 <= distancia_atr <= 2.0:
        return 78.0
    elif 0.5 <= distancia_atr < 1.0 or 2.0 < distancia_atr <= 3.0:
        return 72.0
    else:
        return 65.0


# ==========================
# REGISTROS
# ==========================


def gerar_registro_fallback(coin):
    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    return {
        "par": coin,
        "modo": "POSICIONAL",
        "sinal": "NAO_ENTRAR",
        "preco": 0.0,
        "alvo": 0.0,
        "ganho_pct": 0.0,
        "assert_pct": 60.0,
        "data": now.strftime("%Y-%m-%d"),
        "hora": now.strftime("%H:%M"),
    }


def gerar_sinais_posicional(exchanges):
    resultados = []

    for coin in COINS:
        symbol = f"{coin}/USDT"

        try:
            # 1) Histórico
            ohlcv = get_ohlcv_multi(
                exchanges,
                symbol,
                timeframe=TIMEFRAME_POSICIONAL,
            )
            closes = [c[4] for c in ohlcv]

            # 2) Tendência
            side = detectar_tendencia(closes)

            # 3) Preço ao vivo
            preco_live = get_price_live(exchanges, symbol)

            # 4) ATR
            atr = calc_atr(ohlcv)

            # 5) Alvo
            alvo = escolher_alvo_estatistico_adaptativo(
                ohlcv=ohlcv,
                atr=atr,
                side=side,
                preco_live=preco_live,
            )

            # 6) GANHO %: SEMPRE POSITIVO
            if preco_live and preco_live > 0:
                ganho_pct = abs(alvo - preco_live) / preco_live * 100.0
            else:
                ganho_pct = 0.0
                alvo = preco_live

            if ganho_pct > GANHO_MAXIMO_PCT:
                ganho_pct = GANHO_MAXIMO_PCT

            ganho_pct = round(ganho_pct, 2)

            # 7) Assertividade
            assert_pct = calcular_assertividade(preco_live, alvo, atr)
            assert_pct = round(assert_pct, 2)

            # 8) Data / hora
            now = datetime.now(ZoneInfo("America/Sao_Paulo"))
            data_str = now.strftime("%Y-%m-%d")
            hora_str = now.strftime("%H:%M")

            # 9) Filtro de entrada (3%)
            if side in ("LONG", "SHORT") and ganho_pct >= GANHO_MINIMO_PCT:
                sinal_final = side
            else:
                sinal_final = "NAO_ENTRAR"

            resultados.append({
                "par": coin,
                "modo": "POSICIONAL",
                "sinal": sinal_final,
                "preco": float(round(preco_live, 3)),
                "alvo": float(round(alvo, 3)),
                "ganho_pct": float(ganho_pct),
                "assert_pct": float(assert_pct),
                "data": data_str,
                "hora": hora_str,
            })

        except Exception as e:
            print(f"[erro] {symbol} POSICIONAL: {e}")
            resultados.append(gerar_registro_fallback(coin))

        time.sleep(0.2)

    return resultados


# ==========================
# FUNÇÃO PRINCIPAL
# ==========================


def main():
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"
    data_dir.mkdir(exist_ok=True)

    saida_arquivo = data_dir / "entrada.json"

    exchanges = criar_exchanges()

    # SWING DESLIGADO (mantido como lista vazia no JSON)
    swing_sinais = []

    pos_sinais = gerar_sinais_posicional(exchanges)

    total_moedas = len(COINS)
    total_processadas = len(pos_sinais)
    ultima_atualizacao = datetime.now(
        ZoneInfo("America/Sao_Paulo")
    ).isoformat(timespec="seconds")

    dados = {
        "swing": swing_sinais,
        "posicional": pos_sinais,
        "total_moedas": total_moedas,
        "total_processadas": total_processadas,
        "ultima_atualizacao": ultima_atualizacao,
    }

    with saida_arquivo.open("w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=4)

    print(f"[OK] entrada.json gerado em {saida_arquivo}")
    print(f"Moedas processadas (posicional): {total_processadas}/{total_moedas}")


if __name__ == "__main__":
    main()
