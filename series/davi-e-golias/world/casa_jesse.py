"""
A casa de Jessé em Belém: uma sala só, pequena e apertada, de pedra de campo e barro, com a mobília da época.

Os dois lugares da série a usam: belem.json (eps. 1 e 2, a casa de verdade, no alto do morro) e vale-de-ela.json
(ep. 3, o canto de Belém de onde o Davi sai com a comida para os irmãos). Assim a casa é a mesma nos dois.
"""


def casa_jesse(origin, elevation, size=(7.0, 5.2)):
    """A sala de Jessé com o canto noroeste em `origin`, o chão em `elevation` e a porta na parede sul."""
    cx, cz = origin
    cw, cd = size
    return {
        "id": "casa-jesse",
        "name": "Casa de Jessé",
        "origin": [cx, cz],
        "size": [cw, cd],
        "elevation": elevation,
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
