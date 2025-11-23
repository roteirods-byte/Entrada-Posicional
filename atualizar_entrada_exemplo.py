import json
import json
from datetime import datetime

COINS = [
    "AAVE", "ADA", "APT", "ARB", "ATOM", "AVAX", "AXS", "BCH", "BNB",
    "BTC", "DOGE", "DOT", "ETH", "FET", "FIL", "FLUX", "ICP", "INJ",
    "LDO", "LINK", "LTC", "NEAR", "OP", "PEPE", "POL", "RATS", "RENDER",
    "RUNE", "SEI", "SHIB", "SOL", "SUI", "TIA", "TNSR", "TON", "TRX",
    "UNI", "WIF", "XRP",
]

def montar_linha(par: str, indice: int) -> dict:
    agora = datetime.now()
    data = agora.strftime("%Y-%m-%d")
    hora = agora.strftime("%H:%M")

    preco = round(10 + indice * 0.5, 3)
    alvo = round(preco * 1.03, 3)
    ganho = round((alvo - preco) / preco * 100, 2)
    assert_pct = round(70 + (indice % 10), 2)
    sinal = "LONG" if indice % 2 == 0 else "SHORT"

    return {
        "par": par,
        "sinal": sinal,
        "preco": preco,
        "alvo": alvo,
        "ganho": ganho,
        "assert_pct": assert_pct,
        "data": data,
        "hora": hora,
    }

def gerar_entrada():
    swing = []
    posicional = []

    for i, par in enumerate(COINS, start=1):
        swing.append(montar_linha(par, i))
        posicional.append(montar_linha(par, i + 100))

    dados = {"swing": swing, "posicional": posicional}

    with open("entrada.json", "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    print(f"entrada.json atualizado com {len(swing)} moedas em SWING e POSICIONAL.")

if __name__ == "__main__":
    gerar_entrada()
