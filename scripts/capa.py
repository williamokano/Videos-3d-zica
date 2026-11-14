#!/usr/bin/env python3
"""
Artes de lançamento de um episódio: capa, arte de horário (antes da estreia) e arte de story ("já saiu").

A imagem de fundo não é um quadro do vídeo: é um plano feito para a capa (câmera livre do `npm run look`, num
momento forte do episódio, em escala 1), e este script põe por cima a luz, o título, o selo da série e a marca do
canal, com as cores e fontes de canal/marca.json.

  python3 scripts/capa.py capa    --fundo F.png --titulo "O ESCOLHIDO" --tag "EPISÓDIO 1" --serie davi-e-golias -o capa.png
  python3 scripts/capa.py horario --fundo F.png --titulo "O ESCOLHIDO" --tag "EPISÓDIO 1" --quando "SÁBADO · 19H" --serie davi-e-golias -o horario.png
  python3 scripts/capa.py story   --fundo F.png --titulo "O ESCOLHIDO" --tag "EPISÓDIO 1" --serie davi-e-golias -o story.png

Opções:
  --sub "texto"      uma linha curta abaixo do título (pergunta-gancho, até ~28 caracteres)
  --foco 0.5         onde fica o assunto no fundo, de 0 (topo) a 1 (base): o corte para 9:16 o mantém
  --zonas            grava também <saida>-zonas.png com as zonas proibidas e o recorte da grade do perfil

Zonas (9:16, 1080×1920): nada de texto nos 14% de cima (nome do perfil), nos 20% de baixo (legenda, botões)
nem nos 12% da direita (curtir, comentar). O perfil mostra a capa cortada em 3:4 (1080×1440, centro) e às vezes
em 1:1 (1080×1080, centro): o título fica dentro do 1:1.
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1080, 1920
FALLBACK = {
    'title': '/usr/share/fonts/opentype/urw-base35/C059-Bold.otf',
    'body': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
}


def marca(serie):
    """Cores, fontes, logo e selo do canal e da série (canal/marca.json), com padrões se ainda não existir."""
    path = os.path.join(ROOT, 'canal', 'marca.json')
    m = json.load(open(path)) if os.path.exists(path) else {}
    pal = {'bg': '#14100c', 'accent': '#e8b04a', 'text': '#fff6e6', 'shadow': '#000000', **m.get('palette', {})}
    fonts = {**FALLBACK, **{k: os.path.join(ROOT, v) for k, v in m.get('fonts', {}).items()}}
    s = m.get('series', {}).get(serie, {}) if serie else {}
    if s.get('accent'):
        pal['accent'] = s['accent']
    if s.get('bg'):
        pal['bg'] = s['bg']
    title_font = os.path.join(ROOT, s['titleFont']) if s.get('titleFont') else fonts['title']
    logo = os.path.join(ROOT, m['logo']) if m.get('logo') else None
    seal = os.path.join(ROOT, s['seal']) if s.get('seal') else None
    return {'pal': pal, 'title': title_font, 'body': fonts.get('bodyBold', fonts['body']), 'logo': logo, 'seal': seal,
            'channel': m.get('channel', 'historinhas.animadas.3d')}


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(FALLBACK['body'], size)


def rgb(hex_color, alpha=255):
    h = hex_color.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def fundo(path, foco):
    """O fundo em 1080×1920, cortado em volta do foco, com contraste e calor de cinema e vinheta."""
    img = Image.open(path).convert('RGB')
    k = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    top = min(max(0, round(foco * img.height - H / 2)), img.height - H)
    left = (img.width - W) // 2
    img = img.crop((left, top, left + W, top + H))
    img = ImageEnhance.Contrast(img).enhance(1.12)
    img = ImageEnhance.Color(img).enhance(1.08)
    # Vinheta: escurece as bordas, o olho vai para o centro.
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).ellipse((-W * 0.25, -H * 0.12, W * 1.25, H * 1.12), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(160))
    dark = Image.new('RGB', (W, H), (0, 0, 0))
    img = Image.composite(img, Image.blend(img, dark, 0.65), mask)
    return img.convert('RGBA')


def gradiente(img, y0, y1, cor, alpha):
    """Uma faixa que escurece de y0 (transparente) a y1 (alpha), para o texto ler sobre qualquer fundo."""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r, g, b, _ = rgb(cor)
    step = 1 if y1 >= y0 else -1
    n = abs(y1 - y0) or 1
    for i, y in enumerate(range(y0, y1, step)):
        d.line([(0, y), (W, y)], fill=(r, g, b, round(alpha * i / n)))
    # Depois de y1, a faixa continua no máximo até a borda.
    if step > 0:
        d.rectangle((0, y1, W, H), fill=(r, g, b, alpha))
    else:
        d.rectangle((0, 0, W, y1), fill=(r, g, b, alpha))
    return Image.alpha_composite(img, layer)


def texto(img, xy, s, f, cor, sombra='#000000', anchor='mm', glow=None):
    """Texto com sombra suave (e brilho opcional, na cor dada)."""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text(xy, s, font=f, fill=rgb(sombra, 200), anchor=anchor)
    shadow = layer.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, shadow)
    if glow:
        g = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(g).text(xy, s, font=f, fill=rgb(glow, 150), anchor=anchor)
        img = Image.alpha_composite(img, g.filter(ImageFilter.GaussianBlur(22)))
    top = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(top).text(xy, s, font=f, fill=rgb(cor), anchor=anchor)
    return Image.alpha_composite(img, top)


def caber(s, path, largura, maior):
    """O maior tamanho de fonte em que `s` cabe em `largura`."""
    size = maior
    while size > 20:
        f = font(path, size)
        if f.getbbox(s)[2] - f.getbbox(s)[0] <= largura:
            return f
        size -= 4
    return font(path, size)


def colar(img, path, centro, largura):
    if not path or not os.path.exists(path):
        return img
    p = Image.open(path).convert('RGBA')
    k = largura / p.width
    p = p.resize((round(p.width * k), round(p.height * k)), Image.LANCZOS)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    layer.paste(p, (round(centro[0] - p.width / 2), round(centro[1] - p.height / 2)), p)
    return Image.alpha_composite(img, layer)


def faixa(img, y, s, f, m, fill=None, cor=None):
    """Uma etiqueta (EPISÓDIO 1, ESTREIA...) numa pílula de cor."""
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = d.textbbox((W / 2, y), s, font=f, anchor='mm')
    pad_x, pad_y = 34, 16
    box = (x0 - pad_x, y0 - pad_y, x1 + pad_x, y1 + pad_y)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=rgb(fill or m['pal']['accent'], 235))
    img = Image.alpha_composite(img, layer)
    ImageDraw.Draw(img).text((W / 2, y), s, font=f, fill=rgb(cor or m['pal']['bg']), anchor='mm')
    return img


def arte(kind, a):
    m = marca(a.serie)
    img = fundo(a.fundo, a.foco)
    pal = m['pal']
    # Escuro embaixo (onde vai o texto) e um pouco em cima (nome do perfil por cima da capa).
    img = gradiente(img, 760, 1560, pal['bg'], 235)
    img = gradiente(img, 330, 0, pal['bg'], 150)
    # O título dentro do recorte 1:1 do perfil (y 420–1500) e longe das zonas da interface.
    ytitle = 1290
    ftitle = caber(a.titulo, m["title"], 2 * (round(W * 0.88) - W // 2) - 40, 168)
    img = colar(img, m['seal'], (W / 2, 1105), 380)
    if not m['seal'] and a.serie_nome:
        img = texto(img, (W / 2, 1120), a.serie_nome, caber(a.serie_nome, m['title'], 640, 86), pal['accent'], glow=pal['accent'])
    img = texto(img, (W / 2, ytitle), a.titulo, ftitle, pal['text'], glow=pal['accent'])
    if a.tag:
        img = faixa(img, 1422, a.tag, font(m['body'], 40), m)
    if a.sub:
        img = texto(img, (W / 2, 1500), a.sub, caber(a.sub, m["body"], 2 * (round(W * 0.88) - W // 2) - 60, 50), pal['text'])
    if kind == 'horario':
        img = faixa(img, 470, 'ESTREIA', font(m['body'], 46), m)
        img = texto(img, (W / 2, 580), a.quando or '', caber(a.quando or "", m["body"], 2 * (round(W * 0.88) - W // 2) - 40, 92), pal['text'], glow=pal['accent'])
    if kind == 'story':
        img = faixa(img, 470, a.quando or 'JÁ SAIU · NOVO EPISÓDIO', font(m['body'], 46), m)
    # A marca do canal, discreta, fora das zonas: em cima, abaixo do nome do perfil.
    if m['logo'] and os.path.exists(m['logo']):
        img = colar(img, m['logo'], (W / 2, 330), 300)
    else:
        img = texto(img, (W / 2, 330), m['channel'], font(m['body'], 34), pal['text'])
    return img.convert('RGB')


def zonas(img):
    """As zonas proibidas em vermelho e os recortes da grade (3:4 e 1:1) em verde, para conferir."""
    z = img.convert('RGBA')
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for box in [(0, 0, W, round(H * 0.14)), (0, round(H * 0.80), W, H), (round(W * 0.88), 0, W, H)]:
        d.rectangle(box, fill=(255, 0, 0, 70))
    d.rectangle((0, 240, W - 1, 1680), outline=(0, 255, 0, 255), width=6)
    d.rectangle((0, 420, W - 1, 1500), outline=(0, 200, 255, 255), width=6)
    return Image.alpha_composite(z, layer).convert('RGB')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('kind', choices=['capa', 'horario', 'story'])
    p.add_argument('--fundo', required=True)
    p.add_argument('--titulo', required=True)
    p.add_argument('--tag', default='')
    p.add_argument('--sub', default='')
    p.add_argument('--quando', default='')
    p.add_argument('--serie', default='')
    p.add_argument('--serie-nome', dest='serie_nome', default='', help='nome da série, se ela ainda não tem selo')
    p.add_argument('--foco', type=float, default=0.45)
    p.add_argument('--zonas', action='store_true')
    p.add_argument('-o', '--out', required=True)
    a = p.parse_args()
    img = arte(a.kind, a)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    img.save(a.out)
    print(a.out)
    if a.zonas:
        z = os.path.splitext(a.out)[0] + '-zonas.png'
        zonas(img).save(z)
        print(z)


if __name__ == '__main__':
    sys.exit(main())
