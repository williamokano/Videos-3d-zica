#!/usr/bin/env python3
"""A arte do canal historinhas.animadas.3d (perfil, logo, selo, destaques, banner), a partir das fotos
dos personagens que canal/estudio/posar.mjs tira da engine (fundo verde) em out/canal/r/;
rode antes canal/estudio/fotos.sh.

    python3 canal/estudio/arte.py            # tudo
    python3 canal/estudio/arte.py perfil     # só uma peça (perfil, logo, selo, destaques, banner)

As cores e as fontes vêm de canal/marca.json, para que o resto da produção use as mesmas.
"""
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CANAL = ROOT / 'canal'
FOTOS = ROOT / 'out' / 'canal' / 'r'
MARCA = json.loads((CANAL / 'marca.json').read_text())
P = MARCA['palette']
DAVI = MARCA['series']['davi-e-golias']


def rgb(hex_):
    hex_ = hex_.lstrip('#')
    return tuple(int(hex_[i:i + 2], 16) for i in (0, 2, 4))


NOITE, NOITE2, CREME, LANTERNA, CORAL, TINTA = (rgb(P[k]) for k in ('bg', 'bg2', 'text', 'accent', 'accent2', 'ink'))
CREME_SOMBRA = rgb(P['textShade'])
LANTERNA_SOMBRA = rgb(P['accentShade'])
CORAL_SOMBRA = rgb(P['accent2Shade'])


def fonte(papel, tamanho):
    return ImageFont.truetype(str(ROOT / MARCA['fonts'][papel]), tamanho)


# ---- Recortes da engine ----

def recorte(nome, brilho=1.12):
    """A foto da engine sem o verde, cortada no que sobra."""
    a = np.asarray(Image.open(FOTOS / f'{nome}.png').convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    verde = g - np.maximum(r, b)
    alpha = np.clip(1 - (verde - 25) / 70, 0, 1)
    a[..., 1] = np.minimum(g, np.maximum(r, b) + 8)  # tira o verde que vaza nas bordas
    out = np.dstack([a, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    img = Image.merge('RGBA', (*ImageEnhance.Brightness(img.convert('RGB')).enhance(brilho).split(), img.getchannel('A')))
    return img.crop(img.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def altura(img, h):
    return img.resize((round(img.width * h / img.height), h), Image.LANCZOS)


# ---- Forma em cel: preenchimento, faixa de sombra, contorno de tinta e espessura 3D ----

def dilatar(mask, raio):
    out = mask
    while raio > 0:
        passo = min(raio, 6)
        out = out.filter(ImageFilter.MaxFilter(passo * 2 + 1))
        raio -= passo
    return out


def cel(mask, cor, sombra=None, contorno=14, fundo=18, corte=0.6, tinta=TINTA, brilho=None):
    """Uma máscara (L) vira peça de desenho em cel: cor chapada, uma faixa de sombra embaixo,
    contorno de tinta e uma espessura que desce para a direita, como o traço da engine."""
    pad = contorno + fundo + 4
    m = Image.new('L', (mask.width + 2 * pad, mask.height + 2 * pad))
    m.paste(mask, (pad, pad))
    borda = dilatar(m, contorno)
    out = Image.new('RGBA', m.size, (0, 0, 0, 0))
    bloco = Image.new('RGBA', m.size, (*tinta, 255))
    for k in range(fundo, -1, -1):
        out.paste(bloco, (k, k), borda)
    out.paste(Image.new('RGBA', m.size, (*cor, 255)), (0, 0), m)
    if sombra:
        box = m.getbbox()
        y = round(box[1] + (box[3] - box[1]) * corte)
        faixa = Image.new('L', m.size)
        ImageDraw.Draw(faixa).rectangle((0, y, m.width, m.height), fill=255)
        out.paste(Image.new('RGBA', m.size, (*sombra, 255)), (0, 0), ImageChops.multiply(m, faixa))
    if brilho:
        # um risco de luz no alto, como o reflexo chapado do cel
        box = m.getbbox()
        y = round(box[1] + (box[3] - box[1]) * 0.16)
        faixa = Image.new('L', m.size)
        ImageDraw.Draw(faixa).rectangle((0, box[1], m.width, y), fill=255)
        dentro = m.filter(ImageFilter.MinFilter(9))
        out.paste(Image.new('RGBA', m.size, (*brilho, 255)), (0, 0), ImageChops.multiply(dentro, faixa))
    return out.crop(out.getbbox())


def mascara_texto(texto, f, espaco=0):
    box = f.getbbox(texto)
    w = box[2] - box[0] + espaco * max(0, len(texto) - 1) + 8
    m = Image.new('L', (w, box[3] + 8))
    d = ImageDraw.Draw(m)
    if espaco:
        x = -box[0] + 4
        for ch in texto:
            d.text((x, 4), ch, font=f, fill=255)
            x += f.getlength(ch) + espaco
    else:
        d.text((-box[0] + 4, 4), texto, font=f, fill=255)
    return m.crop(m.getbbox())


def texto_cel(texto, f, cor, sombra, contorno, fundo, espaco=0, brilho=None):
    return cel(mascara_texto(texto, f, espaco), cor, sombra, contorno, fundo, brilho=brilho)


def selo_3d(tamanho, angulo=-8):
    """O selo "3D": um quadrado arredondado coral com o 3D em creme, inclinado."""
    f = fonte('title', round(tamanho * 0.62))
    w, h = round(tamanho * 1.18), tamanho
    m = Image.new('L', (w, h))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=round(h * 0.26), fill=255)
    placa = cel(m, CORAL, CORAL_SOMBRA, contorno=max(4, tamanho // 16), fundo=max(5, tamanho // 11), corte=0.62)
    letras = texto_cel('3D', f, CREME, CREME_SOMBRA, contorno=max(3, tamanho // 22), fundo=max(3, tamanho // 18))
    placa.alpha_composite(letras, ((w - letras.width) // 2 + tamanho // 24, (h - letras.height) // 2 + tamanho // 26))
    return placa.rotate(angulo, resample=Image.BICUBIC, expand=True)


def brilho_estrela(d, cx, cy, r, cor, tinta=None):
    """Uma estrelinha de quatro pontas."""
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.3
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    if tinta:
        d.polygon(pts, fill=cor, outline=tinta, width=max(2, round(r / 7)))
    else:
        d.polygon(pts, fill=cor)


def fundo_noite(w, h, centro=(0.5, 0.42), estrelas=60, semente=3):
    """Azul-noite com um clarão quente no meio e poeira de estrelas: a hora da história."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = centro[0] * w, centro[1] * h
    d = np.sqrt(((x - cx) / w) ** 2 + ((y - cy) / w) ** 2)
    t = np.clip(d / 0.75, 0, 1)[..., None]
    a = np.array(NOITE2, np.float32) * (1 - t) + np.array(NOITE, np.float32) * t
    img = Image.fromarray(a.astype(np.uint8), 'RGB').convert('RGBA')
    d_ = ImageDraw.Draw(img)
    rnd = random.Random(semente)
    for _ in range(estrelas):
        sx, sy = rnd.random() * w, rnd.random() * h
        r = rnd.choice([2, 2, 3, 3, 4])
        c = rnd.choice([CREME, CREME, LANTERNA])
        d_.ellipse((sx - r, sy - r, sx + r, sy + r), fill=(*c, rnd.randint(70, 170)))
    return img


def brilho_quente(img, cx, cy, raio, cor=None, forca=0.55):
    cor = cor or LANTERNA
    g = Image.new('L', img.size)
    ImageDraw.Draw(g).ellipse((cx - raio, cy - raio, cx + raio, cy + raio), fill=int(255 * forca))
    g = g.filter(ImageFilter.GaussianBlur(raio * 0.45))
    camada = Image.new('RGBA', img.size, (*cor, 0))
    camada.putalpha(g)
    img.alpha_composite(camada)


def livro(largura, cor_pag=CREME, sombra=CREME_SOMBRA, capa=CORAL, capa_sombra=CORAL_SOMBRA):
    """Um livro aberto visto de frente, em cel: duas páginas que sobem em curva para a lombada,
    a capa coral por baixo e linhas de texto."""
    w = largura
    h = round(w * 0.42)
    lin = max(4, w // 95)

    def arco(t):  # a borda de cima da página: funda na lombada, alta no meio, cai na ponta
        return h * (0.08 - 0.20 * math.sin(t * math.pi * 0.72) + 0.16 * t)

    def pagina(lado, margem=0.0, desce=0.0):
        meio = w / 2
        topo, base = h * 0.10 + desce, h * 0.80 + desce
        borda = meio - margem
        pts = []
        for i in range(31):  # borda de cima: alta na lombada, cai e volta a subir um pouco na ponta
            t = i / 30
            pts.append((meio + lado * t * borda, topo + arco(t)))
        for i in range(31):  # borda de baixo: da ponta à lombada, com a lombada mais baixa
            t = 1 - i / 30
            pts.append((meio + lado * t * borda, base + h * 0.06 * (1 - t) - h * 0.06 * t + h * 0.04 * math.sin(t * math.pi)))
        return pts

    def mascara(pts):
        m = Image.new('L', (w, h + round(h * 0.3)))
        ImageDraw.Draw(m).polygon(pts, fill=255)
        return m

    pad = lin + max(6, w // 60) + 4
    out = Image.new('RGBA', (w + 2 * pad, h + round(h * 0.3) + 2 * pad), (0, 0, 0, 0))
    capa_m = ImageChops.lighter(mascara(pagina(-1, -w * 0.03, h * 0.12)), mascara(pagina(1, -w * 0.03, h * 0.12)))
    out.alpha_composite(cel(capa_m, capa, capa_sombra, contorno=lin, fundo=max(6, w // 60), corte=0.85), (pad - lin - 4 + capa_m.getbbox()[0], pad - lin - 4 + capa_m.getbbox()[1]))
    for lado in (-1, 1):
        m = mascara(pagina(lado))
        out.alpha_composite(cel(m, cor_pag, sombra, contorno=lin, fundo=0, corte=0.78), (pad - lin - 4 + m.getbbox()[0], pad - lin - 4 + m.getbbox()[1]))
    d = ImageDraw.Draw(out)
    for lado in (-1, 1):
        for k in range(3):
            t0, t1 = 0.14, 0.80 - k * 0.14
            pts = []
            for i in range(16):
                t = t0 + (t1 - t0) * i / 15
                pts.append((pad + w / 2 + lado * t * w / 2, pad + h * 0.34 + k * h * 0.12 + arco(t)))
            d.line(pts, fill=(*CREME_SOMBRA, 255), width=max(3, w // 120), joint='curve')
    return out.crop(out.getbbox())


# ---- Peças ----

def logo():
    """A marca escrita: historinhas / animadas [3D]."""
    l1 = texto_cel('historinhas', fonte('title', 230), CREME, CREME_SOMBRA, 14, 16, espaco=2, brilho=(255, 252, 244))
    l2 = texto_cel('animadas', fonte('title', 168), LANTERNA, LANTERNA_SOMBRA, 13, 14, espaco=2)
    s = selo_3d(150)
    w2 = l2.width + 18 + s.width
    w = max(l1.width, w2) + 40
    h = l1.height + l2.height - 10 + 30
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(l1, ((w - l1.width) // 2, 0))
    x2 = (w - w2) // 2
    y2 = l1.height - 10
    out.alpha_composite(l2, (x2, y2))
    out.alpha_composite(s, (x2 + l2.width + 18, y2 + (l2.height - s.height) // 2 + 4))
    d = ImageDraw.Draw(out)
    brilho_estrela(d, w - 70, 46, 30, LANTERNA, TINTA)
    out = out.crop(out.getbbox())
    out.save(CANAL / 'logo.png')
    return out


def disco(raio, cor, sombra, contorno=14, fundo=16):
    m = Image.new('L', (2 * raio, 2 * raio))
    ImageDraw.Draw(m).ellipse((0, 0, 2 * raio - 1, 2 * raio - 1), fill=255)
    return cel(m, cor, sombra, contorno, fundo, corte=0.72)


def perfil():
    S = 1080
    img = fundo_noite(S, S, centro=(0.5, 0.45), estrelas=40, semente=7)
    d = ImageDraw.Draw(img)
    # a lua de lanterna atrás, o livro aberto embaixo e a letra saindo dele
    lua = disco(330, LANTERNA, LANTERNA_SOMBRA, 14, 0)
    img.alpha_composite(lua, ((S - lua.width) // 2, 128))
    lv = livro(700)
    h_ = texto_cel('h', fonte('title', 600), CREME, CREME_SOMBRA, 20, 24, brilho=(255, 252, 244))
    hx, hy = (S - h_.width) // 2 - 60, 175
    img.alpha_composite(h_, (hx, hy))
    img.alpha_composite(lv, ((S - lv.width) // 2, 640))
    s = selo_3d(200, angulo=-10)
    img.alpha_composite(s, (hx + h_.width - 120, hy + 250))
    brilho_estrela(d, 262, 262, 40, CREME, TINTA)
    brilho_estrela(d, 830, 230, 26, CREME, TINTA)
    img.convert('RGB').save(CANAL / 'perfil.png')
    # a prévia: como o Instagram mostra, em círculo, pequeno e médio
    prev = Image.new('RGB', (900, 420), (250, 250, 250))
    x = 40
    for tam in (110, 320):
        p = img.resize((tam, tam), Image.LANCZOS).convert('RGB')
        m = Image.new('L', (tam * 4, tam * 4))
        ImageDraw.Draw(m).ellipse((0, 0, tam * 4 - 1, tam * 4 - 1), fill=255)
        prev.paste(p, (x, (420 - tam) // 2), m.resize((tam, tam), Image.LANCZOS))
        x += tam + 60
    # também no fundo escuro do modo noturno
    escuro = Image.new('RGB', (900 - x + 20, 420), (0, 0, 0))
    p = img.resize((110, 110), Image.LANCZOS).convert('RGB')
    m = Image.new('L', (440, 440))
    ImageDraw.Draw(m).ellipse((0, 0, 439, 439), fill=255)
    escuro.paste(p, ((escuro.width - 110) // 2, 155), m.resize((110, 110), Image.LANCZOS))
    prev.paste(escuro, (x - 20, 0))
    prev.save(CANAL / 'perfil-preview.png')


DAVI_COR, DAVI_FUNDO = rgb(DAVI['accent']), rgb(DAVI['bg'])
DAVI_SOMBRA = (190, 132, 52)


def selo_davi(salvar=True):
    """O selo da série: uma plaqueta de terra com DAVI em Cinzel dourado. Mesma linguagem de
    contorno e espessura do canal; a letra é da série."""
    W, H = 900, 330
    m = Image.new('L', (W, H))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), radius=70, fill=255)
    placa = cel(m, DAVI_FUNDO, (48, 24, 16), contorno=12, fundo=16, corte=0.75)
    d = ImageDraw.Draw(placa)
    o = 12 + 4
    d.rounded_rectangle((o + 22, o + 22, o + W - 23, o + H - 23), radius=50, outline=(*DAVI_COR, 255), width=6)
    nome = cel(mascara_texto(DAVI['name'], fonte_serie('titleFont', 190), espaco=26), DAVI_COR, DAVI_SOMBRA, contorno=8, fundo=8, corte=0.62)
    placa.alpha_composite(nome, (o + (W - nome.width) // 2 + 4, o + 38))
    f = fonte_serie('subtitleFont', 44)
    sub = 'CORAGEM E DESTINO'
    sm = mascara_texto(sub, f, espaco=6)
    y = o + 38 + nome.height + 4
    cor = Image.new('RGBA', sm.size, (*CREME, 255))
    placa.paste(cor, (o + (W - sm.width) // 2, y), sm)
    # dois traços e uma pedrinha de funda de cada lado do subtítulo
    for lado in (-1, 1):
        x = o + W / 2 + lado * (sm.width / 2 + 40)
        d.line((x, y + sm.height / 2, x + lado * 46, y + sm.height / 2), fill=(*DAVI_COR, 255), width=5)
        d.ellipse((x + lado * 60 - 8, y + sm.height / 2 - 8, x + lado * 60 + 8, y + sm.height / 2 + 8), fill=(*DAVI_COR, 255))
    placa = placa.crop(placa.getbbox())
    if salvar:
        placa.save(CANAL / 'selo-serie-davi.png')
    return placa


def fonte_serie(papel, tamanho):
    return ImageFont.truetype(str(ROOT / DAVI[papel]), tamanho)


def claquete(largura):
    """A claquete de cinema, em cel: corpo creme com faixas, haste coral aberta."""
    w = largura
    h = round(w * 0.62)
    corpo = Image.new('L', (w, h))
    ImageDraw.Draw(corpo).rounded_rectangle((0, 0, w - 1, h - 1), radius=w // 14, fill=255)
    c = cel(corpo, CREME, CREME_SOMBRA, contorno=w // 40, fundo=w // 30, corte=0.7)
    d = ImageDraw.Draw(c)
    o = w // 40 + 4
    for k in range(2):
        y = o + h * (0.38 + k * 0.22)
        d.line((o + w * 0.12, y, o + w * (0.62 - k * 0.2), y), fill=(*CREME_SOMBRA, 255), width=w // 28)
    haste = Image.new('L', (w, round(w * 0.2)))
    dh = ImageDraw.Draw(haste)
    dh.rounded_rectangle((0, 0, w - 1, round(w * 0.2) - 1), radius=w // 30, fill=255)
    hc = cel(haste, CORAL, CORAL_SOMBRA, contorno=w // 40, fundo=w // 40, corte=0.7)
    dd = ImageDraw.Draw(hc)
    for k in range(5):  # as listras diagonais da haste
        x = o + w * (0.06 + k * 0.2)
        dd.polygon([(x, o), (x + w * 0.09, o), (x + w * 0.04, o + w * 0.2), (x - w * 0.05, o + w * 0.2)], fill=(*CREME, 255))
    # a haste aberta, presa no canto de cima à esquerda do corpo
    topo = hc.height + round(w * 0.05)
    out = Image.new('RGBA', (c.width + 60, c.height + topo + 40), (0, 0, 0, 0))
    camada = Image.new('RGBA', out.size, (0, 0, 0, 0))
    camada.alpha_composite(hc, (0, topo - hc.height + o + round(w * 0.07)))
    camada = camada.rotate(16, resample=Image.BICUBIC, center=(o, topo))
    out.alpha_composite(c, (0, topo))
    out.alpha_composite(camada)
    return out.crop(out.getbbox())


def play(largura):
    w = largura
    m = Image.new('L', (w, w))
    r = w * 0.08
    pts = [(r, r), (w - r, w / 2), (r, w - r)]
    ImageDraw.Draw(m).polygon(pts, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(w // 18)).point(lambda v: 255 if v > 110 else 0)
    return cel(m, CREME, CREME_SOMBRA, contorno=w // 26, fundo=w // 22, corte=0.62)


def ajustar(img, caixa):
    k = min(caixa[0] / img.width, caixa[1] / img.height)
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)


def destaque(nome, cor, sombra, conteudo, desloca=(0, 0)):
    W, H = 1080, 1920
    img = fundo_noite(W, H, centro=(0.5, 0.5), estrelas=50, semente=len(nome) * 5)
    dsc = disco(400, cor, sombra, 16, 0)
    cx, cy = W // 2, H // 2
    img.alpha_composite(dsc, (cx - dsc.width // 2, cy - dsc.height // 2))
    img.alpha_composite(conteudo, (cx - conteudo.width // 2 + desloca[0], cy - conteudo.height // 2 + desloca[1]))
    d = ImageDraw.Draw(img)
    brilho_estrela(d, cx - 330, cy - 320, 34, CREME, TINTA)
    brilho_estrela(d, cx + 350, cy - 250, 22, CREME, TINTA)
    pasta = CANAL / 'destaques'
    pasta.mkdir(exist_ok=True)
    img.convert('RGB').save(pasta / f'{nome}.png')
    return img


def rosto(nome, largura):
    """Cabeça e ombros da foto da engine, num recorte redondo em baixo (para caber no disco)."""
    r = recorte(nome, 1.1)
    return altura(r, largura) if r.width < r.height else r.resize((largura, round(r.height * largura / r.width)), Image.LANCZOS)


def destaques():
    destaque('1-episodios', CORAL, CORAL_SOMBRA, play(420), desloca=(30, 0))
    destaque('2-bastidores', rgb(P['bg2']), (32, 39, 92), claquete(520))
    # personagens: Davi e Maria, de séries diferentes, lado a lado
    dv = altura(recorte('davi-rosto', 1.08), 520)
    mr = altura(recorte('maria-rosto', 1.05), 500)
    par = Image.new('RGBA', (dv.width + mr.width - 120, 560), (0, 0, 0, 0))
    par.alpha_composite(mr, (dv.width - 120, 560 - mr.height))
    par.alpha_composite(dv, (0, 560 - dv.height))
    destaque_circular('3-personagens', LANTERNA, LANTERNA_SOMBRA, par)
    # Davi: o selo da série sobre o Davi
    dv = altura(recorte('davi-rosto', 1.08), 640)
    sl = ajustar(selo_davi(salvar=False), (600, 300))
    comp = Image.new('RGBA', (max(dv.width, sl.width), dv.height + 40), (0, 0, 0, 0))
    comp.alpha_composite(dv, ((comp.width - dv.width) // 2, 0))
    comp.alpha_composite(sl, ((comp.width - sl.width) // 2, comp.height - sl.height - 150))
    destaque_circular('4-davi', DAVI_COR, DAVI_SOMBRA, comp, fundo_disco=DAVI_FUNDO)
    lv = livro(600)
    prox = Image.new('RGBA', (lv.width, lv.height + 330), (0, 0, 0, 0))
    prox.alpha_composite(lv, (0, 330))
    dp = ImageDraw.Draw(prox)
    for x, y, r, cor in ((prox.width * 0.5, 150, 92, LANTERNA), (prox.width * 0.24, 250, 46, CREME), (prox.width * 0.78, 215, 58, CORAL), (prox.width * 0.66, 60, 30, CREME)):
        brilho_estrela(dp, x, y, r, cor, TINTA)
    destaque('5-proximas-historias', rgb(P['bg2']), (32, 39, 92), prox, desloca=(0, 10))
    # sobre o canal: a marca do perfil
    marca = Image.open(CANAL / 'perfil.png').convert('RGBA').crop((60, 50, 1020, 1010))
    destaque_circular('6-sobre', NOITE, NOITE, marca.resize((800, 800), Image.LANCZOS), fundo_disco=NOITE)


def destaque_circular(nome, cor, sombra, conteudo, fundo_disco=None, borda=None):
    """Um destaque em que o conteúdo fica dentro do disco (cortado por ele), com o anel por cima."""
    W, H = 1080, 1920
    img = fundo_noite(W, H, centro=(0.5, 0.5), estrelas=50, semente=len(nome) * 5)
    R = 400
    cx, cy = W // 2, H // 2
    disco_img = Image.new('RGBA', (2 * R, 2 * R), (*(fundo_disco or cor), 255))
    if fundo_disco and fundo_disco != cor:
        brilho_quente(disco_img, R, R + 60, R, cor=cor, forca=0.5)
    c = conteudo if conteudo.size == (2 * R, 2 * R) else ajustar(conteudo, (2 * R - 60, 2 * R - 60))
    disco_img.alpha_composite(c, (R - c.width // 2, 2 * R - c.height - (40 if c.height < 2 * R - 100 else 0)))
    m = Image.new('L', (8 * R, 8 * R))
    ImageDraw.Draw(m).ellipse((0, 0, 8 * R - 1, 8 * R - 1), fill=255)
    m = m.resize((2 * R, 2 * R), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    d.ellipse((cx - R - 16, cy - R - 16, cx + R + 16, cy + R + 16), fill=(*TINTA, 255))
    img.paste(disco_img, (cx - R, cy - R), m)
    if borda:
        d.ellipse((cx - R + 10, cy - R + 10, cx + R - 10, cy + R - 10), outline=(*borda, 255), width=12)
    brilho_estrela(d, cx - 330, cy - 320, 34, CREME, TINTA)
    brilho_estrela(d, cx + 350, cy - 250, 22, CREME, TINTA)
    pasta = CANAL / 'destaques'
    pasta.mkdir(exist_ok=True)
    img.convert('RGB').save(pasta / f'{nome}.png')


def texto_centro(img, y, texto, f, cor, sombra_px=0):
    d = ImageDraw.Draw(img)
    w = d.textlength(texto, font=f)
    x = (img.width - w) / 2
    if sombra_px:
        d.text((x + sombra_px, y + sombra_px), texto, font=f, fill=(*TINTA, 255))
    d.text((x, y), texto, font=f, fill=(*cor, 255))


def banner():
    """O post/story de apresentação: a marca, a promessa, personagens de duas séries saindo do
    mesmo livro, e a série de agora. Texto só entre 14% e 80% da altura."""
    W, H = 1080, 1920
    img = fundo_noite(W, H, centro=(0.5, 0.5), estrelas=90, semente=11)
    brilho_quente(img, W // 2, 1080, 420, forca=0.30)
    lg = ajustar(Image.open(CANAL / 'logo.png'), (900, 400))
    img.alpha_composite(lg, ((W - lg.width) // 2, 300))
    y = 300 + lg.height + 26
    texto_centro(img, y, 'Grandes histórias em episódios curtos,', fonte('bodyBold', 46), CREME, 3)
    texto_centro(img, y + 64, 'para ver em família.', fonte('bodyBold', 50), LANTERNA, 3)
    texto_centro(img, y + 136, 'Uma história nova toda semana.', fonte('body', 38), CREME_SOMBRA, 2)
    # o livro é o palco: personagens de séries diferentes na mesma escala (px por metro)
    pm = 178
    base = 1372
    lv = livro(980)
    img.alpha_composite(lv, ((W - lv.width) // 2, base - 70))
    figuras = [  # (foto, altura em metros, x do centro)
        ('golias', 3.1, 240),
        ('lucas', 1.76, 840),
        ('davi-cheer', 1.72 * 1.16, 470),  # os braços levantados passam da cabeça
        ('maria', 1.63, 665),
    ]
    cena = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for nome, metros, x in figuras:
        f = altura(recorte(nome, 1.2), round(metros * pm))
        cena.alpha_composite(f, (x - f.width // 2, base - f.height))
    # sombra no papel e contorno de tinta em volta do grupo, para destacar do fundo
    sombra = Image.new('L', (W, H))
    dsom = ImageDraw.Draw(sombra)
    for nome, metros, x in figuras:
        dsom.ellipse((x - 85, base - 16, x + 85, base + 14), fill=110)
    camada = Image.new('RGBA', (W, H), (*TINTA, 0))
    camada.putalpha(sombra.filter(ImageFilter.GaussianBlur(8)))
    img.alpha_composite(camada)
    sil = dilatar(cena.getchannel('A').point(lambda v: 255 if v > 60 else 0), 6)
    contorno = Image.new('RGBA', (W, H), (*TINTA, 0))
    contorno.putalpha(sil)
    img.alpha_composite(contorno)
    img.alpha_composite(cena)
    # a série de agora, como etiqueta na página
    sl = ajustar(selo_davi(salvar=False), (380, 140))
    img.alpha_composite(sl, ((W - sl.width) // 2, H - round(H * 0.20) - sl.height - 4))
    img.convert('RGB').save(CANAL / 'banner-apresentacao.png')
    # prova das zonas: o que o Instagram cobre
    prova = img.copy()
    d = ImageDraw.Draw(prova)
    d.rectangle((0, 0, W, round(H * 0.14)), fill=(255, 0, 0, 90))
    d.rectangle((0, H - round(H * 0.20), W, H), fill=(255, 0, 0, 90))
    prova.convert('RGB').resize((540, 960)).save(ROOT / 'out' / 'canal' / 'banner-zonas.png')


if __name__ == '__main__':
    pecas = {'logo': logo, 'perfil': perfil, 'selo': selo_davi, 'destaques': destaques, 'banner': banner}
    for nome in sys.argv[1:] or pecas:
        pecas[nome]()
        print('ok', nome)
