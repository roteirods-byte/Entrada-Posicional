from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pytz

# ====== MOEDAS OFICIAIS DO PROJETO (ordem alfabética) ======
MOEDAS_OFICIAIS = [
    "AAVE",
    "ADA",
    "APE",
    "APT",
    "AR",
    "ARB",
    "ATOM",
    "AVAX",
    "AXS",
    "BAT",
    "BCH",
    "BLUR",
    "BNB",
    "BONK",
    "BTC",
    "COMP",
    "CRV",
    "DASH",
    "DGB",
    "DENT",
    "DOGE",
    "DOT",
    "EGLD",
    "EOS",
    "ETC",
    "ETH",
    "FET",
    "FIL",
    "FLOKI",
    "FLOW",
    "FTM",
    "GALA",
    "GLM",
    "GRT",
    "HBAR",
    "IMX",
    "INJ",
    "IOST",
    "ICP",
    "KAS",
    "KAVA",
    "KSM",
    "LINK",
    "LTC",
    "MANA",
    "MATIC",
    "MKR",
    "NEO",
    "NEAR",
    "OMG",
    "ONT",
    "OP",
    "ORDI",
    "PEPE",
    "QNT",
    "QTUM",
    "RNDR",
    "ROSE",
    "RUNE",
    "SAND",
    "SEI",
    "SHIB",
    "SNX",
    "SOL",
    "STX",
    "SUSHI",
    "TIA",
    "THETA",
    "TRX",
    "UNI",
    "VET",
    "XRP",
    "XEM",
    "XLM",
    "XVS",
    "ZEC",
    "ZRX",
]
# ====== PASTAS / ARQUIVOS ======
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

ENTRADA_JSON_PATH = DATA_DIR / "entrada.json"
SAIDA_MANUAL_JSON_PATH = DATA_DIR / "saida_manual.json"
SAIDA_MONITORAMENTO_JSON_PATH = DATA_DIR / "saida_monitoramento.json"

# ====== TIMEZONE / FORMATAÇÃO ======
TZ = pytz.timezone("America/Sao_Paulo")

PRECO_CASAS_DECIMAIS = 3
PCT_CASAS_DECIMAIS = 2

# ====== PARÂMETROS ======
ATR_PERIODO = 14
ATR_MULTIPLICADOR_LONG = 1.5
ATR_MULTIPLICADOR_SHORT = 1.5

GANHO_MAXIMO_PCT = 50.0
GANHO_MINIMO_PCT = 3.0


@dataclass
class SinalEntrada:
    par: str
    side: str   # LONG / SHORT / NAO_ENTRAR
    modo: str   # POSICIONAL
    preco: float
    alvo: float
    ganho_pct: float
    assert_pct: float
    data: str
    hora: str


def formatar_preco(valor: float) -> float:
    return round(float(valor), PRECO_CASAS_DECIMAIS)


def formatar_pct(valor: float) -> float:
    return round(float(valor), PCT_CASAS_DECIMAIS)


def agora_sp() -> tuple[str, str]:
    now = datetime.now(TZ)
    data_str = now.strftime("%Y-%m-%d")
    hora_str = now.strftime("%H:%M")
    return data_str, hora_str


def garantir_pastas():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
