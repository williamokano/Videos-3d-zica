#!/usr/bin/env python3
"""
Gera vale-de-ela.json: o vale de Elá, os dois montes com os acampamentos, a tenda do rei e a cidade da volta.

O lugar é dado da série; este script só existe porque ele tem centenas de pedras, arbustos e tendas espalhados
por sorteio. Mude as constantes aqui e rode de novo (python3 series/davi-e-golias/world/gerar-vale.py); não
edite o JSON à mão, ou a próxima geração apaga a mudança. O sorteio tem semente fixa: sai sempre igual.

Eixos: x leste, z sul. Israel no monte norte (z negativo), filisteus no monte sul (z positivo), o riacho no
fundo do vale, ao longo de x, em z = 0. A cidade fica a leste, em chão plano.
"""
import json
import math
import os
import random

from casa_jesse import casa_jesse

R = random.Random(1017)  # 1 Samuel 17

ALTURA = 9.0          # altura do topo dos dois montes
BORDA = 33.8           # |z| onde o topo plano termina (ali fica a fila de batalha)
PE = 14.0              # |z| onde a encosta encontra o fundo do vale
FUNDO = -0.9           # o leito do riacho
CIDADE = (175.0, 0.0)  # centro da praça da cidade

terrain = {
    "hills": [
        # Os dois montes: compridos ao longo do vale, com topo plano para os acampamentos.
        {"at": [0, -50], "radius": [115, 36], "height": ALTURA, "top": 0.45},
        {"at": [0, 50], "radius": [115, 36], "height": ALTURA, "top": 0.45},
        # O leito do riacho.
        {"at": [0, 0], "radius": [150, 7], "height": FUNDO, "top": 0.4},
        # Morros mais longe, para o horizonte não ser uma linha reta.
        {"at": [-40, -235], "radius": [210, 95], "height": 42},
        {"at": [70, 245], "radius": [230, 95], "height": 38},
        {"at": [-270, 10], "radius": [90, 210], "height": 30},
        {"at": [345, -10], "radius": [95, 210], "height": 26},
        {"at": [-150, -70], "radius": [60, 45], "height": 9},
        {"at": [-160, 80], "radius": [70, 45], "height": 11},
        {"at": [140, 90], "radius": [55, 40], "height": 8},
    ],
    "highColor": "#a69660",
    "lowColor": "#7c8c48",
    "slopeColor": "#8e7450",
    "resolution": 1.5,
    "roughness": 0.45,
    "walkable": [
        {"origin": [-26, -66], "size": [52, 132]},
        {"origin": [CIDADE[0] - 40, CIDADE[1] - 16], "size": [60, 32]},
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
    """Altura aproximada do chão (sem as ondulações), para saber onde é encosta."""
    return sum(h["height"] * hill_weight(h, x, z) for h in terrain["hills"])


props = []


def prop(asset, x, z, rot=0, y=None, params=None, id=None, **extra):
    p = {"asset": asset, "pos": [round(x, 2), round(z, 2)]}
    if id:
        p = {"id": id, **p}
    if rot:
        p["rot"] = round(rot, 1)
    if y is not None:
        p["y"] = y
    if params:
        p["params"] = params
    p.update(extra)
    props.append(p)


def free(x, z, taken, gap):
    return all(math.hypot(x - a, z - b) >= gap + r for a, b, r in taken)


# ---- O riacho ----
prop("ancient.stream", 0, 0, params={"length": 220, "width": 2.6, "seed": 3})
for i in range(14):
    x = -60 + i * 9 + R.uniform(-3, 3)
    prop("ancient.pebbles", x, R.choice([-1, 1]) * R.uniform(1.6, 2.6), params={"width": R.uniform(3, 6), "depth": 1.2, "seed": i})
# Capim verde no fundo do vale, mais perto da água.
for i in range(40):
    x = R.uniform(-90, 90)
    z = R.choice([-1, 1]) * R.uniform(3.2, 13)
    if abs(x) < 6 and abs(z) < 12:
        continue
    prop("nature.grass", x, z, params={"width": round(R.uniform(3, 8), 1), "depth": round(R.uniform(2, 5), 1), "density": 1})
# As cinco pedras do Davi ficam no raso, perto da margem norte (o episódio as traz, com id).

# ---- Pedras, arbustos e oliveiras no vale e nas encostas ----
taken = [(0, 6, 14)]  # o meio do vale, onde os dois se enfrentam e a câmera gira em volta, fica livre
corredor = lambda x, z: abs(x) < 7 and abs(z) < 36  # o caminho do Davi e do Golias
for _ in range(260):
    x, z = R.uniform(-100, 100), R.uniform(-40, 40)
    if corredor(x, z) or abs(z) < 3.2:
        continue
    if not free(x, z, taken, 1.0):
        continue
    slope = abs(z) > PE - 2 and abs(z) < BORDA + 1
    kind = R.random()
    if kind < 0.45:
        prop("ancient.dryBush", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(0.6, 1.3), 2)})
        taken.append((x, z, 0.6))
    elif kind < 0.8:
        prop("ancient.rock", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(0.3, 1.0), 2)})
        taken.append((x, z, 0.5))
    elif kind < 0.9 and slope:
        prop("ancient.boulder", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(1.4, 2.6), 2)})
        taken.append((x, z, 1.6))
    elif abs(z) < PE:
        prop("ancient.oliveTree", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999)})
        taken.append((x, z, 2.5))
# Arbustos mais longe, ao longo dos morros, para a encosta não ficar careca nos planos abertos.
for _ in range(220):
    x, z = R.uniform(-150, 150), R.choice([-1, 1]) * R.uniform(34, 140)
    if abs(x) < 50 and abs(z) < 72:
        continue
    prop("ancient.dryBush", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999), "size": round(R.uniform(0.8, 1.6), 2)})
for _ in range(40):
    x, z = R.uniform(-140, 140), R.choice([-1, 1]) * R.uniform(40, 130)
    if abs(x) < 45 and abs(z) < 72:
        continue
    prop("ancient.oliveTree", x, z, rot=R.uniform(0, 360), params={"seed": R.randrange(999)})


# ---- Acampamentos ----
def acampamento(side, cloth, banner, line_shields):
    """side -1 = Israel (norte), +1 = filisteus (sul)."""
    s = side
    # A fila de batalha na beira do topo: estandartes e escudos no chão; os soldados são do elenco.
    for x in (-21, -7, 7, 21):
        prop("ancient.banner", x, s * (BORDA + 2.5), params={"color": banner, "seed": int(x) + 50})
    for x in (-24, 24):
        prop("ancient.groundShields", x, s * (BORDA + 4), rot=R.uniform(0, 360), params={"color": line_shields})
        prop("ancient.spearRack", x + 3 * (1 if x < 0 else -1), s * (BORDA + 5), rot=90)
    # Tendas em fileiras soltas atrás da fila, deixando uma rua no meio (x de -4 a 4) e a área do rei livre.
    for row, z in enumerate([41, 48, 55, 62, 69]):
        for x in range(-44, 45, 8):
            jx, jz = x + R.uniform(-1.5, 1.5), z + R.uniform(-1.5, 1.5)
            if abs(jx) < 7:
                continue
            if side < 0 and abs(jx) < 14 and 38 < jz < 53:
                continue  # a tenda do rei e o terreiro em frente
            prop("ancient.tent", jx, s * jz, rot=(0 if side > 0 else 180) + R.uniform(-12, 12),
                 params={"color": R.choice(cloth), "style": R.choice(["ridge", "ridge", "long"]), "size": round(R.uniform(0.9, 1.2), 2), "seed": R.randrange(999)})
    # Fogueiras, sacos, jarros, carroças e burros nos vãos.
    for x, z in [(-10, 39.5), (11, 40), (-26, 51), (26, 57), (-18, 65), (18, 66)]:
        prop("ancient.campfire", x, s * z, params={"seed": R.randrange(99)})
        for k in range(R.randint(1, 3)):
            a = R.uniform(0, 6.28)
            prop("ancient.jar", x + math.cos(a) * 1.8, s * z + math.sin(a) * 1.8, params={"seed": R.randrange(99)})
    for x, z, r in [(-32, 44, 30), (33, 52, -20), (-36, 63, 80)]:
        prop("ancient.cart", x, s * z, rot=r, params={"load": 1})
    for x, z in [(-30, 40), (31, 64), (-3, 70)]:
        prop("ancient.hitchedDonkey", x, s * z, rot=R.uniform(0, 360))


acampamento(-1, ["#d9c8a4", "#b89a72", "#cfb58a", "#a88660"], "#3a5f9a", "#7a5a3a")
acampamento(+1, ["#8f3b2b", "#c47a3a", "#5d4a3a", "#d8b07a"], "#9a2b22", "#8a6a3a")

# A carga do Davi e o guarda das bagagens: perto da trilha que sobe do norte para o acampamento de Israel.
for i, (x, z) in enumerate([(-13, -42), (-14.2, -42.6), (-12.2, -43.4), (-13.6, -44)]):
    prop("ancient.sack", x, z, rot=R.uniform(0, 360), params={"count": 2, "seed": i})
prop("ancient.cart", -16.5, -45, rot=70, params={"load": 1})
prop("ancient.jar", -11.6, -44.6, params={"count": 3})
# A trilha que chega do norte (de Belém), por onde o Davi sobe.
for i in range(6):
    prop("ancient.rock", -9 + R.uniform(-2, 2), -64 + i * 3.5, params={"seed": 300 + i, "size": 0.4})

# ---- A tenda do rei Saul: o pavilhão (aberto para o sul, para o vale) e o que tem dentro ----
TENDA = (0.0, -45.0)  # centro
tx, tz = TENDA
prop("ancient.royalTent", tx, tz, params={"width": 10, "depth": 8, "height": 3.8, "color": "#e6d3a8", "trim": "#7a2a2a"})
for asset, dx, dz, rot, params in [
    ("ancient.rug", 0, 0.4, 0, {"width": 6, "depth": 4.6, "color": "#8c2f2a"}),
    ("ancient.cushion", 0, -2.4, 0, {"color": "#c9a23a"}),
    ("ancient.cushion", -1.3, -2.2, 20, {"color": "#6b2f6a", "shape": "bolster"}),
    ("ancient.cushion", 1.3, -2.2, -15, {"color": "#2f4f6b"}),
    ("ancient.lowTable", 0, -1.1, 0, {"jar": 1, "cups": 2, "fruit": 1}),
    ("ancient.chest", -4.0, -3.0, 90, {}),
    ("ancient.chest", 4.0, -3.0, -90, {"color": "#5a3a22"}),
    ("ancient.jar", -4.2, 2.6, 0, {"count": 3}),
    ("ancient.spearRack", 4.2, 2.0, -90, {"count": 3}),
    ("ancient.basket", -3.4, -0.6, 0, {"bread": 1}),
]:
    prop(asset, tx + dx, tz + dz, rot=rot, params=params or None)
for x in (-6.5, 6.5):
    prop("ancient.banner", tx + x, tz + 5, params={"color": "#7a2a2a", "seed": 9})

# ---- A cidade (episódio 2): estrada, portão, casas e poço ----
cx, cz = CIDADE
rooms = []
rooms.append({"id": "estrada", "name": "Estrada da cidade", "origin": [cx - 40, cz - 2.5], "size": [26, 5], "outdoor": True, "floorColor": "#b89c70", "elevation": 0.01})
rooms.append({"id": "praca", "name": "Praça da cidade", "origin": [cx - 14, cz - 14], "size": [34, 28], "outdoor": True, "floorColor": "#c9b28a", "elevation": 0.01})
prop("ancient.wall", cx - 14, cz - 9, rot=90, params={"length": 10})
prop("ancient.wall", cx - 14, cz + 9, rot=90, params={"length": 10})
prop("ancient.cityGate", cx - 14, cz, rot=90)
for i, (x, z, r) in enumerate([(-6, -10, 0), (2, -10.5, 0), (10, -10, 0), (-6, 10, 180), (2, 10.5, 180), (10, 10, 180), (16, -2, -90), (16, 6, -90)]):
    prop("ancient.house", cx + x, cz + z, rot=r, params={"seed": i + 1, "width": round(R.uniform(5, 6.5), 1), "depth": round(R.uniform(4.5, 5.5), 1)})
prop("ancient.well", cx + 4, cz)
for x, z in [(-20, -6), (-24, 7), (-9, -5.5), (12, 5), (-30, -5)]:
    prop("ancient.palm", cx + x, cz + z, params={"seed": int(x * 7 + z)})
for i in range(12):
    prop("ancient.oliveTree", cx + R.uniform(-60, 40), cz + R.choice([-1, 1]) * R.uniform(18, 40), params={"seed": 700 + i})

# ---- Um canto de Belém (ep. 3): a casa de Jessé e o terreiro, de onde o Davi sai de madrugada com a comida ----
# Longe do vale, em chão plano, atrás dos morros do norte: do acampamento não se vê. A casa é a mesma de belem.json.
BELEM = (-200.0, -160.0)  # canto noroeste da casa de Jessé
bx, bz = BELEM
rooms.append(casa_jesse(BELEM, round(ground(bx + 3.5, bz + 2.6), 2)))
terrain["walkable"].append({"origin": [bx - 16, bz - 8], "size": [44, 40]})
# O terreiro: sacos, a carroça e os jarros.
prop("ancient.sack", bx + 7.5, bz + 6.4, params={"count": 3})
prop("ancient.cart", bx + 10.5, bz + 3, rot=-80)
prop("ancient.jar", bx - 0.8, bz + 6.2, params={"count": 2})
# As casas vizinhas e as oliveiras.
for i, (x, z, rot) in enumerate([(-9, 1, 0), (17, -1, 0), (-10, 12, 90), (19, 12, -90), (5, -9, 180)]):
    prop("ancient.house", bx + x, bz + z, rot=rot, params={"seed": 30 + i, "width": round(R.uniform(5, 6.5), 1), "depth": round(R.uniform(4.5, 5.5), 1)})
for i, (x, z) in enumerate([(13, 9), (-4, 17), (24, 20), (-14, 22)]):
    prop("ancient.oliveTree", bx + x, bz + z, params={"seed": 740 + i})
for i in range(30):
    x, z = bx + R.uniform(-16, 28), bz + R.uniform(5, 32)
    if bx - 2 < x < bx + 20 and z < bz + 15:
        continue  # o terreiro fica limpo
    prop("ancient.rock", x, z, rot=R.uniform(0, 360), params={"seed": 900 + i, "size": round(R.uniform(0.2, 0.45), 2)})

location = {
    "id": "vale-de-ela",
    "name": "Vale de Elá",
    "ground": {"color": "#959558", "size": 600},
    "terrain": terrain,
    "spawn": {"pos": [0, -10], "yaw": 0},
    "rooms": rooms,
    "props": props,
}

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "vale-de-ela.json"), "w") as f:
    json.dump(location, f, ensure_ascii=False, indent=1)
print(f"vale-de-ela.json: {len(props)} props, {len(rooms)} áreas")
