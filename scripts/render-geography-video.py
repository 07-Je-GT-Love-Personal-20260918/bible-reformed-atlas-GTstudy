"""Render a silent six-scene geography review video from the published scene data."""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
assets = root / 'assets' / 'geo'
scenes = json.loads((root / 'data' / 'geo-scenes.json').read_text(encoding='utf-8-sig'))
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
fonts = Path('C:/Windows/Fonts')
regular = fonts / 'msyh.ttc'
bold = fonts / 'msyhbd.ttc'
width, height, fps, duration = 960, 540, 15, 10

def font(size, strong=False):
    return ImageFont.truetype(str(bold if strong else regular), size)

def lines(draw, content, style, limit):
    line = ''
    for character in content:
        if draw.textlength(line + character, font=style) > limit:
            yield line
            line = character
        else:
            line += character
    if line:
        yield line

def timecode(seconds):
    return f'{seconds//3600:02}:{seconds//60%60:02}:{seconds%60:02}.000'

with subprocess.Popen([
    ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{width}x{height}',
    '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast',
    '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(assets/'story.mp4')
], stdin=subprocess.PIPE) as encoder:
    for index, scene in enumerate(scenes):
        frame = Image.new('RGB', (width,height), '#f6f0e3')
        draw = ImageDraw.Draw(frame)
        tone = scene['color']
        draw.rectangle((0,0,width,12), fill=tone)
        draw.text((40,28), '圣经地理  /  一分钟故事线', '#40635f', font=font(20))
        draw.text((40,61), scene['title'], '#173835', font=font(39, True))
        draw.text((42,122), scene['era'], tone, font=font(20, True))
        layout = [(55 + (lon-12)*15, 328 - (lat-28)*10) for _,lat,lon in scene['places']]
        draw.rounded_rectangle((40,161,565,364), radius=14, fill='#e9e8dd')
        for x in range(65,565,28):
            draw.line((x,175,x,350),fill='#d4dbce')
        for y in range(183,355,27):
            draw.line((52,y,553,y),fill='#d4dbce')
        draw.text((54,175),'↑ 北', '#456661', font=font(15, True))
        for j, (name,_,_) in enumerate(scene['places']):
            draw.text((592,172+j*35),f'{j+1}  {name}', '#173835', font=font(21))
        draw.text((43,377),'地理选点与叙事方向示意', '#456661', font=font(15))
        for j,line in enumerate(lines(draw,scene['story'],font(24),860)):
            draw.text((42,411+j*34),line,'#173835',font=font(24))
        for tick in range(fps*duration):
            image = frame.copy()
            canvas = ImageDraw.Draw(image)
            count = min(len(layout),1 + tick//10)
            if count > 1:
                canvas.line(layout[:count],fill=tone,width=4)
            for j,(x,y) in enumerate(layout[:count]):
                canvas.ellipse((x-12,y-12,x+12,y+12),fill=tone)
                canvas.text((x,y),str(j+1),'white',font=font(15,True),anchor='mm')
            for j in range(len(scenes)):
                x=42+j*147
                canvas.rounded_rectangle((x,510,x+138,515),radius=2,fill=tone if j<=index else '#d9ddd0')
            encoder.stdin.write(image.tobytes())
    encoder.stdin.close()
    if encoder.wait():
        raise RuntimeError('Video encoding failed')

captions = ['WEBVTT','']
for i,scene in enumerate(scenes):
    captions.extend((f'{timecode(i*duration)} --> {timecode((i+1)*duration)}', scene['story'],''))
(assets/'story.vtt').write_text('\n'.join(captions),encoding='utf-8')
