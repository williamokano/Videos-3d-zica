#!/usr/bin/env python3
"""
Gera belem.json: Belém de Judá no tempo de Jessé. A cidade murada no alto de um morro, o portão onde ficam os
anciãos, a estrada que desce, as colinas de pasto com o rebanho, e a casa de Jessé por dentro.

Como gerar-vale.py: o lugar é dado da série, e este script só existe por causa das centenas de pedras, arbustos e
casas sorteados. Mude as constantes aqui e rode de novo (python3 series/davi-e-golias/world/gerar-belem.py). O
sorteio tem semente fixa, então sai sempre igual.

Eixos: x leste, z sul. A cidade fica no topo do morro (z negativo), o portão abre para o sul, e a estrada desce
para as colinas de pasto ao sul.
"""
import json
import math
import os
import random

R = random.Random(1613)  # 1 Samuel 16:13

TOPO = 10.0                 # altura do topo plano do morro da cidade
MURO_Z = -20.0              # linha do muro sul, com o portão no meio
CASA = (8.0, -36.0)         # canto noroeste da casa de Jessé
CASA_TAM = (7.0, 5.2)  # pequena e apertada, como as casas da época
PEDRA_DAVI = (-34.0, 34.0)  # a pedra onde o Davi toca, numa encosta do pasto

terrain = {
    "hills": [
        # O morro da cidade: topo plano largo.
        {"at": [0, -42], "radius": [72, 40], "height": TOPO, "top": 0.55},
        # As colinas de pasto ao sul, onduladas.
        {"at": [-40, 38], "radius": [48, 30], "height": 6},
        {"at": [35, 45], "radius": [45, 32], "height": 4.5},
        {"at": [0, 95], "radius": [90, 40], "height": 11},
        # Horizonte.
        {"at": [-200, -60], "radius": [120, 150], "height": 26},
        {"at": [210, 20], "radius": [110, 170], "height": 22},
        {"at": [0, 230], "radius": [220, 90], "height": 30},
        {"at": [20, -210], "radius": [200, 90], "height": 24},
    ],
    "highColor": "#a39158",
    "lowColor": "#83904c",
    "slopeColor": "#927552",
    "resolution": 1.5,
    "roughness": 0.4,
    "walkable": [
        {"origin": [-30, -64], "size": [60, 48]},   # dentro dos muros
        {"origin": [-12, -18], "size": [24, 30]},   # o portão e a estrada
        {"origin": [-55, 10], "size": [50, 40]},    # o pasto do Davi
    ],
}


def hill_weight(h, x, z):
    rx, rz = (h["radius"], h["radius"]) if isinstance(h["radius"], (int, float)) else h["radius"]
    d = math.hypot((x - h["at"][0]) / rx, (z - h["at"][1]) / rz)
    if d >= 1:
        return 0.0
    top = h.get("top", 0)
    if d <= top:
        return 1.0
    u = (1 - d) / (1 - top)
    return u * u * u * (u * (u * 6 - 15) + 10)


def ground(x, z):
    return sum(h["height"] * hill_weight(h, x, z) for h in terrain["hills"])


props = []


def prop(asset, x, z, rot=0, params=None, id=None, y=None):
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


taken = []


def free(x, z, r):
    return all(math.hypot(x - a, z - b) >= r + q for a, b, q in taken)


# ---- O muro sul e o portão ----
prop("ancient.cityGate", 0, MURO_Z, params={"seed": 4})
for x in (-15, 15):
    prop("ancient.wall", x, MURO_Z, params={"length": 22, "seed": int(x) + 40})
for x, rot in ((-26, 90), (26, 90)):
    prop("ancient.wall", x, MURO_Z - 11, rot=rot, params={"length": 22, "seed": 7})
taken += [(0, MURO_Z, 6), (-15, MURO_Z, 11), (15, MURO_Z, 11)]

# Logo do lado de dentro do portão, no plano, onde os anciãos se sentam: pedras como bancos e uma oliveira de sombra.
# Os bancos: pedras de topo chato onde os anciãos se sentam (os episódios põem cada um em cima de uma).
ANCIAOS = [(-2.2, -24.3), (-1.0, -24.3), (1.6, -24.3), (3.0, -24.5)]
for i, (x, z) in enumerate(ANCIAOS):
    prop("ancient.seatStone", x, z, params={"seed": 80 + i, "height": 0.42, "width": 0.55})
prop("ancient.oliveTree", -6.5, MURO_Z - 6, params={"seed": 12})
prop("ancient.jar", 5.2, MURO_Z - 4.2, params={"count": 2})
taken += [(-1.6, MURO_Z - 4.9, 2), (2.3, MURO_Z - 4.9, 2), (-6.5, MURO_Z - 6, 2.5)]

# ---- As casas dentro dos muros, deixando a rua do portão e o terreiro de Jessé livres ----
casas = [(-18, -28, 0), (-10, -27, 0), (-20, -40, 0), (-11, -42, 0), (-18, -53, 180), (-6, -55, 180),
         (22, -28, 0), (6, -52, 180), (17, -54, 180), (24, -44, -90)]
for i, (x, z, rot) in enumerate(casas):
    prop("ancient.house", x, z, rot=rot, params={"seed": i + 3, "width": round(R.uniform(5, 6.5), 1), "depth": round(R.uniform(4.5, 5.5), 1)})
    taken.append((x, z, 4))
prop("ancient.well", -2.5, -38)
taken.append((-2.5, -38, 2))
for i, (x, z) in enumerate([(-14, -34), (2, -46), (14, -26), (-24, -48)]):
    prop("ancient.palm", x, z, params={"seed": 20 + i})
    taken.append((x, z, 1.5))

# ---- A casa de Jessé: uma sala de verdade, com o terreiro em frente ----
cx, cz = CASA
cw, cd = CASA_TAM
casa_jesse = {
    "id": "casa-jesse",
    "name": "Casa de Jessé",
    "origin": [cx, cz],
    "size": [cw, cd],
    "elevation": TOPO,
    "height": 3.0,
    "rustic": True,
    "floorColor": "#8a7253",
    "wallColor": "#c8b089",
    "openings": [
        {"id": "porta-jesse", "wall": "s", "type": "door", "at": 3.0, "width": 1.2, "leaf": {"style": "planks", "open": 1, "angle": 100}},
        # A janela a oeste deixa entrar o sol baixo do fim da tarde.
        {"id": "janela-oeste", "wall": "w", "type": "window", "at": 2.0, "width": 0.75, "frame": {"kind": "shutters", "open": 1}},
        {"id": "janela-leste", "wall": "e", "type": "window", "at": 3.4, "width": 0.6, "frame": {"kind": "shutters", "open": 0.3}},
    ],
    # Posições relativas ao canto noroeste (x para leste, z para o sul). Paredes: norte em z = 0, oeste em x = 0.
    # Objetos de parede olham para +z com rot 0; na parede oeste rot 90, na leste rot -90.
    "props": [
        # O banco de barro na parede do fundo, onde o Samuel se senta.
        {"asset": "ancient.mudBench", "pos": [3.5, 0.0], "params": {"length": 3.4}},
        # Os postes que seguram a viga do meio.
        {"asset": "ancient.post", "pos": [1.2, 3.6], "params": {"height": 2.85, "seed": 2}},
        {"asset": "ancient.post", "pos": [5.8, 2.6], "params": {"height": 2.85, "seed": 5}},
        # Prateleiras de tábua com potes, um nicho com candeia, panos listrados pendurados.
        {"asset": "ancient.plankShelf", "pos": [1.1, 0.0], "y": 1.65, "params": {"length": 1.4, "seed": 3}},
        {"asset": "ancient.plankShelf", "pos": [7.0, 1.6], "y": 1.55, "rot": -90, "params": {"length": 1.6, "seed": 8}},
        {"asset": "ancient.wallNiche", "pos": [0.0, 3.7], "y": 1.25, "rot": 90, "params": {"item": "lamp"}},
        {"asset": "ancient.hangingCloth", "pos": [7.0, 3.6], "y": 2.05, "rot": -90, "params": {"width": 0.8, "length": 1.4, "color": "#8c3a2a", "seed": 4}},
        {"asset": "ancient.hangingCloth", "pos": [5.6, 0.0], "y": 2.15, "params": {"width": 0.9, "length": 1.2, "color": "#d9c9a4", "seed": 7}},
        # Ervas secas penduradas das vigas.
        {"asset": "ancient.herbBundle", "pos": [2.4, 1.3], "y": 2.6, "params": {"count": 3, "seed": 1}},
        {"asset": "ancient.herbBundle", "pos": [4.8, 3.6], "y": 2.6, "params": {"count": 2, "seed": 6}},
        # O canto do trabalho: a mó de pedra, potes, cestos, a escada para o terraço.
        {"asset": "ancient.quern", "pos": [6.2, 2.4], "rot": -20, "params": {"seed": 2}},
        {"asset": "ancient.potteryGroup", "pos": [6.3, 0.7], "params": {"count": 7, "seed": 5}},
        {"asset": "ancient.basketGroup", "pos": [0.6, 2.5], "params": {"seed": 3}},
        {"asset": "ancient.potteryGroup", "pos": [0.6, 1.0], "params": {"count": 4, "seed": 9}},
        {"asset": "ancient.ladder", "pos": [6.7, 0.5], "rot": -90, "params": {"height": 2.7}},
        # Luz: as candeias, fracas, porque ainda é dia; a luz de verdade vem da porta e da janela.
        {"asset": "ancient.oilLamp", "pos": [5.0, 0.22], "y": 0.42, "params": {"intensity": 3}},
        {"asset": "ancient.lampStand", "pos": [0.5, 0.5], "params": {"kind": "stone", "intensity": 4}},
        {"asset": "ancient.rug", "pos": [3.5, 1.5], "params": {"width": 2.6, "depth": 1.8, "color": "#7a3b2a"}},
    ],
}
taken.append((cx + cw / 2, cz + cd / 2, 6))
# O terreiro: um jumento amarrado, sacos e uma lamparina na porta.
prop("ancient.hitchedDonkey", cx + 1.5, cz + cd + 3.5, rot=90)
prop("ancient.sack", cx + 7.5, cz + cd + 1.2, params={"count": 3})
prop("ancient.cart", cx + 10.5, cz + 3, rot=-80)
taken += [(cx + 1.5, cz + cd + 3.5, 2), (cx + 10.5, cz + 3, 3)]

# ---- O chão da cidade: pedras soltas e mato baixo nos cantos ----
for _ in range(60):
    x, z = R.uniform(-28, 28), R.uniform(-62, -23)
    if abs(x) < 3 and z > -38:
        continue  # a rua do portão
    if not free(x, z, 0.6):
        continue
    prop("ancient.rock", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(0.2, 0.45), 2)})
    taken.append((x, z, 0.4))

# ---- A estrada que desce do portão para o sul ----
for i in range(10):
    z = MURO_Z + 4 + i * 3
    for side in (-1, 1):
        prop("ancient.rock", side * R.uniform(2.6, 3.4), z + R.uniform(-1, 1), params={"seed": 400 + i * 2 + (side > 0), "size": round(R.uniform(0.3, 0.6), 2)})
        taken.append((side * 3, z, 0.6))

# ---- O pasto: o rebanho, a pedra do Davi, oliveiras e arbustos ----
px, pz = PEDRA_DAVI
prop("ancient.boulder", px, pz, params={"seed": 7, "size": 1.3})
# Onde o Davi se senta para tocar, ao lado do rochedo.
ASSENTO = (px + 1.1, pz + 0.6)
prop("ancient.seatStone", ASSENTO[0], ASSENTO[1], params={"seed": 9, "height": 0.55, "width": 0.65})
taken.append((px, pz, 1.5))
prop("ancient.flock", px + 7, pz + 3, params={"count": 22, "width": 18, "depth": 12, "seed": 5})
taken.append((px + 7, pz + 3, 9))
for _ in range(240):
    x, z = R.uniform(-110, 110), R.uniform(-15, 120)
    if abs(x) < 6 and z < 15:
        continue  # a estrada
    if not free(x, z, 1.2):
        continue
    k = R.random()
    if k < 0.5:
        prop("ancient.dryBush", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(0.6, 1.3), 2)})
        taken.append((x, z, 0.6))
    elif k < 0.8:
        prop("ancient.rock", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(0.3, 1.0), 2)})
        taken.append((x, z, 0.5))
    else:
        prop("ancient.oliveTree", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999)})
        taken.append((x, z, 2.5))
for i in range(30):
    x, z = R.uniform(-80, 60), R.uniform(5, 70)
    if abs(x) < 6 and z < 15:
        continue
    prop("nature.grass", x, z, params={"width": round(R.uniform(4, 9), 1), "depth": round(R.uniform(3, 6), 1), "density": 0.8})
# A fogueira do Davi, para a noite.
prop("ancient.campfire", px + 2.4, pz + 1.6, params={"seed": 3, "intensity": 2})

# ---- O palácio do Saul, em Gibeá (longe de tudo, num lugar plano) ----
# O salão do trono: comprido, de pedra, com duas fileiras de colunas, o trono no fundo (norte) e a porta grande ao
# sul, que dá para o pátio de entrada. Uma janela a leste olha para a praça. O trono fica onde o episódio 1 já o
# filmou: (100, -101.8).
SALAO = (93.0, -104.0)       # canto noroeste do salão
SALAO_TAM = (14.0, 22.0)
sx, sz = SALAO
torches = []
for lz in (4.5, 10.5, 16.5):
    torches.append({"asset": "ancient.wallTorch", "pos": [0.0, lz], "y": 1.9, "rot": 90, "params": {"intensity": 9}})
    torches.append({"asset": "ancient.wallTorch", "pos": [14.0, lz], "y": 1.9, "rot": -90, "params": {"intensity": 9}})
# Braseiros dos dois lados do tapete, entre as colunas: o caminho até o trono fica iluminado.
for lz in (9.5, 15.5):
    for lx in (2.2, 11.8):
        torches.append({"asset": "ancient.brazier", "pos": [lx, lz], "params": {"intensity": 7}})
columns = [{"asset": "ancient.column", "pos": [x, z], "params": {"height": 5.9}} for z in (1.2,) for x in (4.2, 9.8)]
columns += [{"asset": "ancient.column", "pos": [x, z], "params": {"height": 5.9}} for z in (7.0, 12.5, 18.0) for x in (3.6, 10.4)]
sala_saul = {
    "id": "sala-saul",
    "name": "Palácio do Saul (salão do trono)",
    "origin": list(SALAO),
    "size": list(SALAO_TAM),
    "height": 6.0,
    "floorColor": "#5c5046",
    "wallColor": "#8a7a66",
    "openings": [
        {"id": "porta-salao", "wall": "s", "type": "door", "at": 7.0, "width": 2.6, "leaf": {"style": "planks", "open": 1, "angle": 95}},
        {"id": "janela-praca", "wall": "e", "type": "window", "at": 9.0, "width": 1.4},
    ],
    "props": [
        {"asset": "ancient.throne", "pos": [7.0, 2.2], "rot": 180},
        *columns,
        # O fundo, atrás do trono: duas tochas e dois braseiros que iluminam o rei de perto.
        {"asset": "ancient.wallTorch", "pos": [4.6, 0.0], "y": 1.7, "params": {"intensity": 5}},
        {"asset": "ancient.wallTorch", "pos": [9.4, 0.0], "y": 1.7, "params": {"intensity": 5}},
        {"asset": "ancient.brazier", "pos": [11.2, 4.4], "params": {"intensity": 7}},
        {"asset": "ancient.brazier", "pos": [5.3, 3.4], "params": {"intensity": 10}},
        # Uma tocha mais alta bem atrás do trono: a parede do fundo não some no escuro.
        {"asset": "ancient.wallTorch", "pos": [7.0, 0.0], "y": 2.7, "params": {"intensity": 7}},
        *torches,
        # O tapete do caminho, da porta ao trono.
        {"asset": "ancient.rug", "pos": [7.0, 4.6], "params": {"width": 4, "depth": 5, "color": "#4a1f2a"}},
        {"asset": "ancient.rug", "pos": [7.0, 14.0], "params": {"width": 2.4, "depth": 13, "color": "#5a2430"}},
        {"asset": "ancient.lowTable", "pos": [8.6, 2.8], "params": {"width": 1, "depth": 0.7, "jar": 1}},
        # Os estandartes nas paredes e um cabide de lanças junto da porta.
        {"asset": "ancient.banner", "pos": [1.2, 2.0], "params": {"seed": 3}},
        {"asset": "ancient.banner", "pos": [12.8, 2.0], "params": {"seed": 5}},
        {"asset": "ancient.spearRack", "pos": [1.0, 20.6], "rot": 90},
        {"asset": "ancient.chest", "pos": [12.9, 5.5], "rot": -90},
        {"asset": "ancient.jar", "pos": [12.8, 19.5], "params": {"count": 3}},
        # O banco baixo onde o Davi vai tocar, diante do trono.
        {"id": "banco-davi", "asset": "ancient.stool", "pos": [7.0, 7.0], "params": {"height": 0.4}},
    ],
}
# O pátio de entrada, ao sul do salão: muro com portão, palmeiras, um poço e jarros. O mensageiro entra pelo portão.
PATIO_Z = sz + SALAO_TAM[1]  # a parede sul do salão (-82)
prop("ancient.cityGate", sx + 7, PATIO_Z + 18, params={"seed": 9, "height": 6})
for x in (sx + 7 - 9, sx + 7 + 9):
    prop("ancient.wall", x, PATIO_Z + 18, params={"length": 12, "seed": int(x)})
for x in (sx - 4, sx + 18):
    prop("ancient.wall", x, PATIO_Z + 12, rot=90, params={"length": 13, "seed": 11})
for x, z in ((sx - 1, PATIO_Z + 4), (sx + 15, PATIO_Z + 4), (sx - 1, PATIO_Z + 14), (sx + 15, PATIO_Z + 14)):
    prop("ancient.palm", x, z, params={"seed": int(x + z) % 17})
prop("ancient.well", sx + 12.5, PATIO_Z + 9)
prop("ancient.jar", sx + 1.5, PATIO_Z + 2, params={"count": 3})
prop("ancient.sack", sx + 13, PATIO_Z + 2, params={"count": 2})
# A fachada: duas colunas dos lados da porta grande e estandartes.
for x in (sx + 4.6, sx + 9.4):
    prop("ancient.column", x, PATIO_Z + 0.9, params={"height": 5.2})
prop("ancient.banner", sx + 3.0, PATIO_Z + 0.8, params={"seed": 4})
prop("ancient.banner", sx + 11.0, PATIO_Z + 0.8, params={"seed": 6})
prop("ancient.wallTorch", sx + 5.2, PATIO_Z + 0.3, y=2.0, params={"intensity": 4})
prop("ancient.wallTorch", sx + 8.8, PATIO_Z + 0.3, y=2.0, params={"intensity": 4})

# ---- A crista onde o exército filisteu aparece contra o sol (ep. 2) ----
CRISTA = (170.0, -60.0)
terrain["hills"].append({"at": list(CRISTA), "radius": [45, 22], "height": 7, "top": 0.25})
terrain["walkable"] += [
    {"origin": [sx - 6, PATIO_Z], "size": [26, 20]},          # o pátio do palácio
    {"origin": [CRISTA[0] - 30, CRISTA[1] - 14], "size": [60, 22]},  # a crista
]
for i in range(18):
    x, z = R.uniform(CRISTA[0] - 40, CRISTA[0] + 40), R.uniform(CRISTA[1] - 4, CRISTA[1] + 20)
    prop("ancient.dryBush", x, z, params={"seed": 700 + i, "size": round(R.uniform(0.6, 1.2), 2)})

location = {
    "id": "belem",
    "name": "Belém",
    "ground": {"color": "#929456", "size": 600},
    "terrain": terrain,
    "spawn": {"pos": [0, -10], "yaw": 0},
    "rooms": [casa_jesse, sala_saul],
    "props": props,
}

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "belem.json"), "w") as f:
    json.dump(location, f, ensure_ascii=False, indent=1)
print(f"belem.json: {len(props)} props, chão na casa de Jessé {ground(cx + cw / 2, cz + cd / 2):.2f} (deve ser {TOPO})")
