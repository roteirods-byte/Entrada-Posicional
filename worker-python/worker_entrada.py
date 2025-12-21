#!/usr/bin/env python3
import json
import time
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

import ccxt

from config_autotrader import (
    MOEDAS_OFICIAIS,
    GANHO_MINIMO_PCT,
    GANHO_MAXIMO_PCT,
)

DATA_DIR = Path("/home/roteiro_ds/Entrada-Posicional/data")
OUT_FILE = DATA_DIR / "entrada.json"

TIMEFRAME_POSICIONAL = "1d"
LOOKBACK_CANDLES = 500
TZ = ZoneInfo("America/Sao_Paulo")

# ordem de prioridade (Bybit removida: está bloqueando 403 no seu servidor)
EX_PRIORITY = ["binance", "okx", "gateio", "kucoin"]

def _round_price(x):
    try:
        x = float(x)
    except Exception:
        return 0.0
    ax = abs(x)
    if ax == 0:
        return 0.0
    if ax >= 1:
        d = 3
    elif ax >= 0.01:
        d = 6
    elif ax >= 0.0001:
        d = 8
    else:
        d = 10
    return float(round(x, d))

def criar_exchanges():
    exs = {
        "binance": ccxt.binance({"enableRateLimit": True}),
        "okx": ccxt.okx({"enableRateLimit": True}),
        "gateio": ccxt.gateio({"enableRateLimit": True}),
        "kucoin": ccxt.kucoin({"enableRateLimit": True}),
    }
    # load_markets para pular símbolos inexistentes
    for name in EX_PRIORITY:
        try:
            exs[name].load_markets()
        except Exception as e:
            print(f"[exchanges] aviso load_markets {name}: {e}")
    return exs

def symbol_exists(ex, symbol):
    try:
        m = getattr(ex, "markets", None)
        if not m:
            return True
        return symbol in m
    except Exception:
        return True

def fetch_ohlcv_any(exs, symbol, timeframe, limit):
    last_err = None
    for name in EX_PRIORITY:
        ex = exs[name]
        try:
            if not symbol_exists(ex, symbol):
                continue
            ohlcv = ex.fetch_ohlcv(symbol, timeframe=timeframe, limit=min(int(limit), 1000))
            if ohlcv and len(ohlcv) >= 220:
                return ohlcv, name
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Falha OHLCV {symbol}: {last_err}")

def fetch_price_any(exs, symbol):
    last_err = None
    for name in EX_PRIORITY:
        ex = exs[name]
        try:
            if not symbol_exists(ex, symbol):
                continue
            t = ex.fetch_ticker(symbol)
            price = t.get("last") or t.get("close")
            if price is not None:
                return float(price), name
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Falha TICKER {symbol}: {last_err}")

def calc_atr(ohlcv, period=14):
    if len(ohlcv) < period + 2:
        return None
    trs = []
    for i in range(1, len(ohlcv)):
        _, o, h, l, c, _v = ohlcv[i]
        _, _o2, _h2, _l2, pc, _v2 = ohlcv[i - 1]
        tr = max(h - l, abs(h - pc), abs(l - pc))
        trs.append(tr)
    trs = trs[-period:]
    return sum(trs) / len(trs) if trs else None

def calc_fibo_levels_recent(ohlcv, window=200):
    w = ohlcv[-window:] if len(ohlcv) > window else ohlcv
    highs = [c[2] for c in w]
    lows  = [c[3] for c in w]
    hi = max(highs)
    lo = min(lows)
    rng = hi - lo
    if rng <= 0:
        return []
    l382 = lo + 0.382 * rng
    l50  = lo + 0.500 * rng
    l618 = lo + 0.618 * rng
    return sorted([l382, l50, l618])

def escolher_alvo_fibo_atr(preco, side, atr, fib_levels):
    if atr is None or atr <= 0:
        atr = 0.0
    fibs = []
    for x in fib_levels or []:
        try:
            fibs.append(float(x))
        except Exception:
            pass
    fibs = sorted(fibs)

    def atr_mult(dist_atr):
        if dist_atr >= 2.2: return 1.9
        if dist_atr >= 1.6: return 1.7
        if dist_atr >= 1.1: return 1.5
        return 1.25

    alvo = preco

    if side == "LONG":
        acima = [x for x in fibs if x > preco]
        if acima:
            cand = min(acima)
            dist = abs(cand - preco) / atr if atr > 0 else 1.5
            alvo = cand
            if atr > 0:
                alvo_min = preco + 1.0 * atr
                if alvo < alvo_min:
                    alvo = alvo_min
                if abs(alvo - preco) < 0.8 * atr:
                    alvo = preco + atr_mult(dist) * atr
        else:
            alvo = preco + (1.5 * atr if atr > 0 else preco * 0.03)

    if side == "SHORT":
        abaixo = [x for x in fibs if x < preco]
        if abaixo:
            cand = max(abaixo)
            dist = abs(cand - preco) / atr if atr > 0 else 1.5
            alvo = cand
            if atr > 0:
                alvo_max = preco - 1.0 * atr
                if alvo > alvo_max:
                    alvo = alvo_max
                if abs(alvo - preco) < 0.8 * atr:
                    alvo = preco - atr_mult(dist) * atr
        else:
            alvo = preco - (1.5 * atr if atr > 0 else preco * 0.03)

    return alvo

def detectar_side_sem_nao_entrar(closes):
    # sempre retorna LONG ou SHORT (se tiver histórico suficiente)
    closes = [float(x) for x in closes if x is not None]
    if len(closes) < 210:
        return None

    series = closes[-210:]
    last = series[-1]

    def ema(vals, period):
        k = 2.0 / (period + 1.0)
        e = vals[0]
        for v in vals[1:]:
            e = v * k + e * (1.0 - k)
        return e

    ema50 = ema(series, 50)
    ema200 = ema(series, 200)

    base = series[-31]
    if base <= 0:
        return None
    roc = (last - base) / base * 100.0

    gap = (ema50 - ema200) / ema200 * 100.0 if ema200 else 0.0
    gap_min = 0.05
    roc_min = 0.20

    if gap > gap_min and roc > roc_min:
        return "LONG"
    if gap < -gap_min and roc < -roc_min:
        return "SHORT"

    # fallback simples (não vira NÃO ENTRAR)
    return "LONG" if last >= ema200 else "SHORT"

def calc_assert_pct(ohlcv, max_trades=260):
    # backtest simples (histórico): acerta direção do próximo candle
    closes = [c[4] for c in ohlcv]
    if len(closes) < 260:
        return 55.0

    start = max(220, len(closes) - max_trades - 2)
    total = 0
    hit = 0

    for i in range(start, len(closes) - 1):
        side = detectar_side_sem_nao_entrar(closes[: i + 1])
        if side not in ("LONG", "SHORT"):
            continue

        cur = closes[i]
        nxt = closes[i + 1]
        if cur is None or nxt is None or cur <= 0:
            continue

        # ignora movimento “zero”
        if abs(nxt - cur) / cur < 0.001:
            continue

        total += 1
        if side == "LONG" and nxt > cur:
            hit += 1
        elif side == "SHORT" and nxt < cur:
            hit += 1

    if total < 25:
        return 55.0

    return round((hit / total) * 100.0, 2)

def ganho_pct(side, preco, alvo):
    if preco is None or alvo is None or preco <= 0 or alvo <= 0:
        return 0.0
    if side == "LONG":
        return max(0.0, (alvo / preco - 1.0) * 100.0)
    if side == "SHORT":
        return max(0.0, (preco / alvo - 1.0) * 100.0)
    return 0.0

def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    exs = criar_exchanges()

    now = datetime.now(TZ)
    data = now.strftime("%Y-%m-%d")
    hora = now.strftime("%H:%M")

    out = {"posicional": []}

    for coin in MOEDAS_OFICIAIS:
        par = coin.strip().upper()
        symbol = f"{par}/USDT"

        row = {
            "par": par,
            "modo": "POSICIONAL",
            "sinal": "SEM DADOS",
            "preco": 0.0,
            "alvo": 0.0,
            "ganho_pct": 0.0,
            "assert_pct": 55.0,
            "data": data,
            "hora": hora,
        }

        try:
            ohlcv, ex_ohlcv = fetch_ohlcv_any(exs, symbol, TIMEFRAME_POSICIONAL, LOOKBACK_CANDLES)
            preco, ex_px = fetch_price_any(exs, symbol)

            closes = [c[4] for c in ohlcv]
            side = detectar_side_sem_nao_entrar(closes)

            atr = calc_atr(ohlcv, 14)
            fibs = calc_fibo_levels_recent(ohlcv, 200)

            if side not in ("LONG", "SHORT"):
                # se não tiver histórico suficiente, trata como sem dados úteis
                raise RuntimeError("Sem histórico suficiente para sinal")

            alvo = escolher_alvo_fibo_atr(preco, side, atr, fibs)
            g = ganho_pct(side, preco, alvo)

            a = calc_assert_pct(ohlcv)

            # regra oficial do JORGE:
            # NÃO ENTRAR apenas quando GANHO < GANHO_MINIMO_PCT (ex.: 3%)
            sinal_final = side if g >= float(GANHO_MINIMO_PCT) else "NÃO ENTRAR"

            # (opcional) trava ganho exagerado se você usa GANHO_MAXIMO_PCT
            try:
                if float(GANHO_MAXIMO_PCT) > 0 and g > float(GANHO_MAXIMO_PCT):
                    sinal_final = "NÃO ENTRAR"
            except Exception:
                pass

            row.update({
                "sinal": sinal_final,
                "preco": _round_price(preco),
                "alvo": _round_price(alvo),
                "ganho_pct": float(round(g, 2)),
                "assert_pct": float(round(a, 2)),
                "data": data,
                "hora": hora,
            })

        except Exception as e:
            # Falhou (sem mercado / erro API) -> mantém 0/0/0 e assert 55
            print(f"[erro] {symbol} POSICIONAL: {e}")

        out["posicional"].append(row)

    tmp = OUT_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    tmp.replace(OUT_FILE)
    print(f"[OK] entrada.json gerado em {OUT_FILE}")
    print(f"Moedas processadas (posicional): {len(out['posicional'])}/{len(MOEDAS_OFICIAIS)}")

if __name__ == "__main__":
    main()
