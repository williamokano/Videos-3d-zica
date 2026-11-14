#!/usr/bin/env bash
# As fotos dos personagens que canal/estudio/arte.py usa (fundo verde, em out/canal/r/).
set -euo pipefail
cd "$(dirname "$0")/../.."
O=out/canal/r
mkdir -p "$O"
R="node canal/estudio/posar.mjs"
$R --ids davi --pose cheer --expr happy --orbit 15 --size 1080x1920 --cam 0,1.0,4.6:0,1.0,0:30 --out $O/davi-cheer.png
$R --ids golias --pose idle --expr angry --orbit -20 --size 1080x1920 --cam 0,1.7,8.2:0,1.65,0:30 --out $O/golias.png
$R --series ceu-vermelho --ids maria --pose gesture --expr happy --orbit -15 --size 1080x1920 --cam 0,1.0,4.6:0,0.95,0:30 --out $O/maria.png
$R --series ceu-vermelho --ids lucas --pose cross --expr happy --orbit -25 --size 1080x1920 --cam 0,1.0,4.6:0,1.0,0:30 --out $O/lucas.png
$R --ids davi --pose idle --expr happy --orbit 20 --size 1080x1080 --cam 0,1.55,1.5:0,1.5,0:30 --out $O/davi-rosto.png
$R --series ceu-vermelho --ids maria --pose idle --expr happy --orbit -20 --size 1080x1080 --cam 0,1.47,1.5:0,1.42,0:30 --out $O/maria-rosto.png
