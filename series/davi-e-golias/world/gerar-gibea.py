#!/usr/bin/env python3
"""
Gera gibea.json: a cidade do rei, para o episódio 5. A estrada chega pelo oeste ao portão; dentro, a praça da festa,
com casas, o poço, palmeiras e fogueiras; no lado norte da praça, o palácio do Saul. O salão do trono é o mesmo dos
eps. 1 e 2 (sala_saul.py), aqui com a porta e uma janela na parede sul, as duas dando para a praça: da janela o rei
vê a festa lá embaixo.

Mude as constantes aqui e rode de novo (python3 series/davi-e-golias/world/gerar-gibea.py); não edite o JSON à mão.
O sorteio tem semente fixa: sai sempre igual.

Eixos: x leste, z sul. A praça vai de z = -14 (a frente do palácio) a z = 16.
"""
import json
import os
import random

from sala_saul import sala_saul

R = random.Random(1018)  # 1 Samuel 18

SALAO = (0.0, -36.0)   # canto noroeste do salão do trono; a parede sul (porta e janela) fica em z = -14
SALAO_TAM = (14.0, 22.0)
FRENTE = SALAO[1] + SALAO_TAM[1]  # z da parede sul do salão: a frente do palácio, na praça
PORTAO = (-10.0, 3.0)  # o portão da cidade, no lado oeste da praça

props = []


def prop(asset, x, z, rot=0, y=None, params=None, id=None):
    p = {"asset": asset, "pos": [round(x, 2), round(z, 2)]}
    if id:
        p = {"id": id, **p}
    if rot:
        p["rot"] = round(rot, 1)
    if y is not None:
        p["y"] = y
    if params:
        p["params"] = params
    props.append(p)


# ---- O palácio ----
# A janela fica na parede sul, à direita da porta (de quem olha da praça): o rei olha a praça de cima do salão.
salao = sala_saul(SALAO, SALAO_TAM, window={"id": "janela-praca", "wall": "s", "type": "window", "at": 11.6, "width": 1.6, "frame": {"kind": "shutters", "open": 1}})
sx, sz = SALAO
# A fachada, na praça: colunas dos lados da porta, estandartes, tochas.
for x in (sx + 4.6, sx + 9.4):
    prop("ancient.column", x, FRENTE + 0.9, params={"height": 5.2})
prop("ancient.banner", sx + 3.0, FRENTE + 0.8, params={"seed": 4})
prop("ancient.banner", sx + 13.6, FRENTE + 0.8, params={"seed": 6})
prop("ancient.wallTorch", sx + 5.2, FRENTE + 0.3, y=2.0, params={"intensity": 4})
prop("ancient.wallTorch", sx + 8.8, FRENTE + 0.3, y=2.0, params={"intensity": 4})
# Os muros de pedra que seguem a fachada para os dois lados, até as casas.
prop("ancient.wall", sx - 4, FRENTE - 0.3, params={"length": 8, "height": 3.2, "seed": 2})
prop("ancient.wall", sx + 18, FRENTE - 0.3, params={"length": 8, "height": 3.2, "seed": 3})

# ---- A estrada e a praça ----
rooms = [
    salao,
    {"id": "estrada", "name": "Estrada da cidade", "origin": [-40.0, 0.5], "size": [30, 5], "outdoor": True, "floorColor": "#b89c70", "elevation": 0.01},
    {"id": "praca", "name": "Praça de Gibeá", "origin": [-10.0, FRENTE], "size": [34, 30], "outdoor": True, "floorColor": "#c9b28a", "elevation": 0.01},
]
# O portão e a muralha, no lado oeste.
gx, gz = PORTAO
prop("ancient.cityGate", gx, gz, rot=90)
prop("ancient.wall", gx, gz - 10, rot=90, params={"length": 12})
prop("ancient.wall", gx, gz + 9, rot=90, params={"length": 10})
# As casas em volta da praça: ao sul (de frente para o norte), a leste (de frente para o oeste) e as duas pontas do norte.
for i, (x, z, r) in enumerate([(-3, 19.5, 180), (5, 20, 180), (13, 19.5, 180), (21, 20, 180), (27.5, 2, -90), (27.5, 10, -90), (-6, FRENTE - 3, 0), (21, FRENTE - 3, 0)]):
    prop("ancient.house", x, z, rot=r, params={"seed": 40 + i, "width": round(R.uniform(5, 6.5), 1), "depth": round(R.uniform(4.5, 5.5), 1), "stair": 1 if i % 3 == 0 else 0})
prop("ancient.well", 17, 6)
for x, z in [(-16, -4), (-22, 9), (-6, 12), (24, -8), (-30, -6)]:
    prop("ancient.palm", x, z, params={"seed": int(x * 7 + z) % 23})
# Dentro do salão, junto da janela: um braseiro que ilumina o rei e quem vem falar com ele à noite.
salao["props"].append({"asset": "ancient.brazier", "pos": [13.3, 21.0], "params": {"intensity": 9}})
# As fogueiras da festa (à noite são elas que iluminam o povo; de dia, fumaça e brasa).
for i, (x, z) in enumerate([(1.5, 8.5), (12.5, 9.5), (19, -2)]):
    prop("ancient.campfire", x, z, params={"seed": 20 + i, "intensity": 3})
# Jarros, sacos e cestos encostados nas casas; bancos de pedra para o povo.
for x, z in [(-2, 15.5), (9.5, 16), (25, 6), (23.5, -10)]:
    prop("ancient.jar", x, z, params={"count": 2 + int(x) % 2})
prop("ancient.sack", 17.5, 16.2, params={"count": 2})
prop("ancient.basket", 26, -2, params={"bread": 1})
for x, z in [(4, 13.5), (22, 13)]:
    prop("ancient.seatStone", x, z, params={"seed": int(x)})
# Fora da muralha: oliveiras e pedras ao longo da estrada.
for i in range(14):
    x, z = R.uniform(-70, -14), R.choice([-1, 1]) * R.uniform(7, 30)
    prop("ancient.oliveTree", x, z, params={"seed": 760 + i})
for i in range(24):
    x, z = R.uniform(-60, -12), R.choice([-1, 1]) * R.uniform(4.5, 14)
    prop("ancient.rock", x, z, rot=R.uniform(0, 360), params={"seed": 800 + i, "size": round(R.uniform(0.2, 0.5), 2)})

terrain = {
    # Morros longe, para o horizonte não ser uma linha reta; a cidade fica em chão plano.
    "hills": [
        {"at": [-60, -180], "radius": [160, 70], "height": 34},
        {"at": [90, 200], "radius": [180, 80], "height": 30},
        {"at": [-230, 30], "radius": [80, 170], "height": 26},
        {"at": [240, -20], "radius": [80, 160], "height": 22},
    ],
    "highColor": "#a69660",
    "lowColor": "#8a8c50",
    "slopeColor": "#8e7450",
    "resolution": 2,
    "roughness": 0.35,
    "walkable": [{"origin": [-75, -45], "size": [110, 85]}],
}

location = {
    "id": "gibea",
    "name": "Gibeá",
    "ground": {"color": "#959558", "size": 600},
    "terrain": terrain,
    "spawn": {"pos": [7, 4], "yaw": 0},
    "rooms": rooms,
    "props": props,
}

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "gibea.json"), "w") as f:
    json.dump(location, f, ensure_ascii=False, indent=1)
print(f"gibea.json: {len(props)} props, {len(rooms)} áreas")
