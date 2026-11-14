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
CASA_TAM = (9.0, 6.5)
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
    "floorColor": "#8c7356",
    "wallColor": "#c4ad86",
    "openings": [
        {"id": "porta-jesse", "wall": "s", "type": "door", "at": 4.5, "width": 1.3, "leaf": {"style": "planks", "open": 1, "angle": 100}},
        {"id": "janela-leste", "wall": "e", "type": "window", "at": 2.2, "width": 0.8, "frame": {"kind": "shutters", "open": 0.5}},
        {"id": "janela-oeste", "wall": "w", "type": "window", "at": 3.6, "width": 0.8, "frame": {"kind": "shutters", "open": 0.8}},
    ],
    "props": [
        {"asset": "ancient.rug", "pos": [4.5, 3.4], "params": {"width": 5.4, "depth": 3.4, "color": "#7a3b2a"}},
        {"asset": "ancient.lowTable", "pos": [4.5, 1.6], "params": {"width": 2.6, "jar": 1, "cups": 4, "fruit": 1}},
        {"asset": "ancient.cushion", "pos": [3.0, 1.0], "params": {"color": "#8a5a2a"}},
        {"asset": "ancient.cushion", "pos": [6.0, 1.0], "params": {"color": "#5a6a3a"}},
        {"asset": "ancient.basket", "pos": [0.8, 0.8], "params": {"bread": 1}},
        {"asset": "ancient.jar", "pos": [8.5, 2.2], "params": {"count": 3}},
        {"asset": "ancient.chest", "pos": [7.9, 0.7]},
        {"asset": "ancient.lampStand", "pos": [0.6, 2.6], "params": {"intensity": 7}},
        {"asset": "ancient.lampStand", "pos": [8.4, 3.4], "params": {"intensity": 7}},
        {"asset": "ancient.lampStand", "pos": [7.2, 5.9], "params": {"kind": "stone", "intensity": 6}},
        {"asset": "ancient.oilLamp", "pos": [4.5, 1.6], "y": 0.42, "params": {"intensity": 5}},
        {"asset": "ancient.sack", "pos": [7.8, 5.6], "params": {"count": 2}},
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

# ---- Um canto do palácio do Saul, em Gibeá, para o gancho do fim (longe de tudo, num lugar plano) ----
SALA = (96.0, -104.0)
sala_saul = {
    "id": "sala-saul",
    "name": "Palácio do Saul (canto)",
    "origin": list(SALA),
    "size": [8, 8],
    "height": 4.2,
    "floorColor": "#5c5046",
    "wallColor": "#7d6f60",
    "props": [
        {"asset": "ancient.throne", "pos": [4, 2.2], "rot": 180},
        {"asset": "ancient.column", "pos": [1.2, 1.2], "params": {"height": 4.1}},
        {"asset": "ancient.column", "pos": [6.8, 1.2], "params": {"height": 4.1}},
        {"asset": "ancient.wallTorch", "pos": [1.6, 0.0], "y": 1.7, "params": {"intensity": 5}},
        {"asset": "ancient.brazier", "pos": [5.6, 5.2], "params": {"intensity": 4}},
        {"asset": "ancient.rug", "pos": [4, 4.6], "params": {"width": 4, "depth": 5, "color": "#4a1f2a"}},
        {"asset": "ancient.lowTable", "pos": [5.6, 2.8], "params": {"width": 1, "depth": 0.7, "jar": 1}},
    ],
}

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
