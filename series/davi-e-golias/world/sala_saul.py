"""
O salão do trono do Saul: comprido, de pedra, com duas fileiras de colunas, o trono no fundo (norte), a porta grande
ao sul e uma janela. Os dois lugares que o usam: belem.json (eps. 1 e 2, o palácio em Gibeá visto de Belém) e
gibea.json (ep. 5, o palácio na praça da cidade). Assim o salão é o mesmo nos dois.
"""


def sala_saul(origin, size=(14.0, 22.0), window=None, elevation=None):
    """O salão com o canto noroeste em `origin`. `window` é a abertura da janela (parede e posição); sem ela, a
    janela a leste do ep. 1 e 2. Posições dos objetos relativas ao canto noroeste (x leste, z sul)."""
    sx, sz = origin
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
        "origin": list(origin),
        "size": list(size),
        "height": 6.0,
        "floorColor": "#5c5046",
        "wallColor": "#8a7a66",
        "openings": [
            {"id": "porta-salao", "wall": "s", "type": "door", "at": 7.0, "width": 2.6, "leaf": {"style": "planks", "open": 1, "angle": 95}},
            window or {"id": "janela-praca", "wall": "e", "type": "window", "at": 9.0, "width": 1.4},
        ],
        "props": [
            {"asset": "ancient.throne", "pos": [7.0, 2.2], "rot": 180},
            *columns,
            # O fundo, atrás do trono: duas tochas e dois braseiros que iluminam o rei de perto.
            {"asset": "ancient.wallTorch", "pos": [4.6, 0.0], "y": 1.7, "params": {"intensity": 5}},
            {"asset": "ancient.wallTorch", "pos": [9.4, 0.0], "y": 1.7, "params": {"intensity": 5}},
            {"asset": "ancient.brazier", "pos": [11.2, 4.4], "params": {"intensity": 7}},
            {"asset": "ancient.brazier", "pos": [5.3, 3.4], "params": {"intensity": 10}},
            # De frente para o trono, fora do quadro do ep. 1: ilumina o rosto e o manto do rei.
            {"asset": "ancient.brazier", "pos": [8.6, 5.0], "params": {"intensity": 9}},
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
    if elevation is not None:
        sala_saul["elevation"] = elevation
    return sala_saul
