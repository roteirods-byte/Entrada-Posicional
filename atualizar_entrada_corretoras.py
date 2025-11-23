import json
import datetime
from datetime import timezone, timedelta
from urllib.request import urlopen
from urllib.error import URLError

# Lista oficial de moedas
COINS = [
    "AAVE", "ADA", "APT", "ARB", "ATOM", "AVAX", "AXS", "BCH", "BNB",
    "BTC", "DOGE", "DOT", "ETH", "FET", "FIL", "FLUX", "ICP", "INJ",
    "LDO", "LINK", "LTC", "NEAR", "OP", "PEPE", "POL", "RATS", "RENDER",
    "RUNE", "SEI", "SHIB", "SOL", "SUI", "TIA", "TNSR", "TON", "TRX",
    "UNI", "WIF", "XRP",
]

# Mapeia ticker -> id no CoinGecko
COINGECKO_IDS = {
    "AAVE": "aave",
    "ADA": "cardano",
    "APT": "aptos",
    "ARB": "arbitrum",
    "ATOM": "cosmos",
    "AVAX": "avalanche-2",
    "AXS": "axie-infinity",
    "BCH": "bitcoin-cash",
    "BNB": "binancecoin",
    "BTC": "bitcoin",
    "DOGE": "dogecoin",
    "DOT": "polkadot",
    "ETH": "ethereum",
    "FET": "fetch-ai",
    "FIL": "filecoin",
    "FLUX": "flux",
    "ICP": "internet-computer",
    "INJ": "injective-protocol",
    "LDO": "lido-dao",
    "LINK": "chainlink",
    "LTC": "litecoin",
    "NEAR": "near",
    "OP": "optimism",
    "PEPE": "pepe",
    "POL": "polygon-ecosystem-token",
    "RATS": "rats",
    "RENDER": "render-token",
    "RUNE": "thorchain",
    "SEI": "sei-network",
    "SHIB": "shiba-inu",
    "SOL": "solana",
    "SUI": "sui",
    "TIA": "celestia",
    "TNSR": "tensor",
    "TON": "the-open-network",
    "TRX": "tron",
    "UNI": "uniswap",
    "WIF": "dogwifcoin",
    "XRP": "ripple",
}


def buscar_precos():
    """Busca preços em USD no CoinGecko para todas as moedas possíveis."""
    ids = sorted({COINGECKO_IDS[c] for c in COINS if c in COINGECKO_IDS})
    ids_param = ",".join(ids)
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        f"?ids={ids_param}&vs_currencies=usd"
    )

    try:
        with urlopen(url, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except URLError as e:
        print("Erro ao chamar CoinGecko:", e)
        return {}

    precos = {}
    for coin in COINS:
        cg_id = COINGECKO_IDS.get(coin)
        if not cg_id:
            print(f"[AVISO] Sem id CoinGecko para {coin}, pulando.")
            continue

        info = data.get(cg_id)
        if not info or "usd" not in info:
            print(f"[AVISO] Sem preço USD para {coin}, pulando.")
            continue

        try:
            precos[coin] = float(info["usd"])
        except (ValueError, TypeError):
            print(f"[AVISO] Preço inválido para {coin}, pulando.")
            continue

    return precos


def montar_linha(par: str, preco: float, indice: int, modo: str) -> dict:
    """Monta uma linha para o painel, com alvo/ganho/assert fixos e sinal simples."""
    # Horário BRT
    brt = timezone(timedelta(hours=-3))
    agora = datetime.datetime.now(tz=brt)
    data = agora.strftime("%Y-%m-%d")
    hora = agora.strftime("%H:%M")

    # Regras simples de alvo / ganho / assertividade
    if modo == "swing":
        alvo = round(preco * 1.03, 3)  # +3%
        ganho_pct = round((alvo - preco) / preco * 100, 2)
        assert_pct = 70.0
    else:  # posicional
        alvo = round(preco * 1.10, 3)  # +10%
        ganho_pct = round((alvo - preco) / preco * 100, 2)
        assert_pct = 72.0

    sinal = "LONG" if indice % 2 == 0 else "SHORT"

    return {
        "par": par,
        "sinal": sinal,
        "preco": round(preco, 3),
        "alvo": alvo,
        "ganho_pct": ganho_pct,
        "assert_pct": assert_pct,
        "data": data,
        "hora": hora,
    }


def gerar_entrada():
    precos = buscar_precos()
    if not precos:
        print("Nenhum preço retornado pelo CoinGecko. Mantendo arquivo anterior.")
        return

    swing = []
    posicional = []

    indice = 1
    for par in COINS:
        preco = precos.get(par)
        if preco is None:
            continue

        swing.append(montar_linha(par, preco, indice, "swing"))
        posicional.append(montar_linha(par, preco, indice, "posicional"))
        indice += 1

    dados = {"swing": swing, "posicional": posicional}

    with open("entrada.json", "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    print(
        f"entrada.json atualizado. Swing: {len(swing)} moedas, "
        f"Posicional: {len(posicional)} moedas."
    )


if __name__ == "__main__":
    gerar_entrada()
