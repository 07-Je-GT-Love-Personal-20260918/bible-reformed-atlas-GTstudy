"""Parse source USFM. Keep every source verse once; group cautiously by narrative episode."""
from pathlib import Path
import re,json,hashlib
codes=['MAT','MRK','LUK','JHN','ACT'];names=['马太福音','马可福音','路加福音','约翰福音','使徒行传'];records={};sections=[]
def clean(s):
 s=re.sub(r'\\f .*?\\f\*','',s,flags=re.S);s=re.sub(r'\\x .*?\\x\*','',s,flags=re.S)
 s=re.sub(r'\\[+a-zA-Z0-9]+\*?\s*','',s)
 return re.sub(r'\s+',' ',s).strip()
for code,name in zip(codes,names):
 file=next(Path('/tmp/cuv-text').glob('*'+code+'*.usfm'));raw=file.read_text(encoding='utf-8-sig');chapter=0;current=None;section=None;data={};labels={};notes={}
 def flush():
  global current
  if current:
   ch,v,text=current;rawVerse=' '.join(text);value=clean(rawVerse);key=f'{ch}:{v.split("-")[0]}';labels[key]=v;notes[key]=[clean(x) for x in re.findall(r'\\f (.*?)\\f\*',rawVerse,flags=re.S)]
   if key in data:raise ValueError('Duplicate verse '+code+key)
   data[key]=value
   if section is not None:section['verses'].append(key)
  current=None
 for line in raw.splitlines():
  if line.startswith('\\c '):flush();chapter=int(re.match(r'\\c (\d+)',line)[1])
  elif line.startswith('\\s1 '):
   flush();section={'book':code,'name':name,'title':clean(line[4:]),'verses':[],'parallel':''};sections.append(section)
  elif line.startswith('\\r '):
   if section is not None:section['parallel']=clean(line[3:])
  elif line.startswith('\\v '):
   flush();m=re.match(r'\\v (\d+(?:-\d+)?)\s*(.*)',line);current=[chapter,m[1],[m[2]]]
   if section is None:section={'book':code,'name':name,'title':name+'开篇','verses':[],'parallel':''};sections.append(section)
  elif current and not line.startswith(('\\id','\\h ','\\toc','\\mt','\\s2','\\d ','\\cl ')):current[2].append(line)
 flush();records[code]={'name':name,'verses':data,'labels':labels,'notes':{k:v for k,v in notes.items() if v},'sourceFile':file.name,'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest()}
sections=[s for s in sections if s['verses']]
for code in codes:
 keys=[v for s in sections if s['book']==code for v in s['verses']];assert len(keys)==len(set(keys))==len(records[code]['verses'])
# Merge clearly parallel episode titles; a teaching repeated in another context stays separate.
normalize={'天国里最伟大的人':'谁最伟大','从无花果树学功课':'从无花果树学个比方','预备逾越节的筵席':'和门徒同度逾越节','彼得不认耶稣':'彼得三次不认主','彼得再次不认耶稣':'彼得三次不认主','耶稣在海上行走':'耶稣在海面上行走','平静风浪':'平静风和海','呼召利未':'呼召马太','设立十二门徒':'十二使徒','挑选十二门徒':'十二使徒','耶稣差遣十二个门徒':'十二使徒的使命','耶稣差遣十二门徒':'十二使徒的使命','治好格拉森被鬼附的人':'治好加大拉被鬼附的人','睚鲁的女儿和血漏的女人':'管会堂者的女儿和血漏的女人','治好被污鬼附身的孩子':'治好被鬼附身的孩子','财主寻求永生之道':'少年财主','富足的官寻求永生之道':'少年财主','治好瞎子巴底买':'治好两个瞎子','治好耶利哥的瞎子':'治好两个瞎子','一个妇人的信心':'迦南妇人的信心','在橄榄山上祷告':'在客西马尼祷告','耶稣降生':'耶稣基督降生','耶稣第二次预言他的死':'耶稣第二次预言受难和复活'}
merge=set('耶稣受洗|耶稣受试探|施洗约翰传道|开始在加利利传道|呼召四个渔夫|一个污鬼附身的人|治好许多病人|在加利利各会堂传道|洁净长大麻风的人|治好瘫痪病人|呼召马太|十二使徒|十二使徒的使命|禁食的问题|安息日的问题|治好枯干了一只手的人|平静风和海|治好加大拉被鬼附的人|管会堂者的女儿和血漏的女人|施洗约翰的死|耶稣给五千人吃饱|耶稣在海面上行走|治好革尼撒勒的病人|古人的传统|迦南妇人的信心|耶稣给四千人吃饱|彼得认耶稣为基督|耶稣预言受难和复活|耶稣改变形象|治好被鬼附身的孩子|耶稣第二次预言受难和复活|休妻的问题|耶稣为小孩祝福|少年财主|耶稣第三次预言受难和复活|治好两个瞎子|光荣地进耶路撒冷|洁净圣殿|质问耶稣的权柄|凶恶园户的比喻|纳税给凯撒的问题|复活的问题|最大的诫命|大卫子孙的问题|寡妇的奉献|预言圣殿被毁|人子的降临|杀害耶稣的阴谋|在伯大尼受膏|犹大出卖耶稣|设立主的晚餐|预言彼得不认主|在客西马尼祷告|耶稣被捕|耶稣在公会里受审|彼得三次不认主|耶稣在彼拉多面前受审|耶稣被判死刑|兵丁戏弄耶稣|耶稣被钉十字架|耶稣的死|耶稣的安葬|耶稣复活|向抹大拉的马利亚显现|向门徒显现|耶稣升天'.split('|'))
def phase(s):
 c,v=map(int,s['verses'][0].split(':'));b=s['book']
 if b=='MAT':return 1 if c<=2 else 2 if c==3 or(c==4 and v<12) else 3 if c<=18 else 4 if c<=20 else 5 if c<=25 else 6 if c<=27 else 7
 if b=='MRK':return 2 if c==1 and v<14 else 3 if c<=9 else 4 if c==10 else 5 if c<=13 else 6 if c<=15 else 7
 if b=='LUK':return 1 if c<=2 else 2 if c==3 or(c==4 and v<14) else 3 if c<9 or(c==9 and v<51) else 4 if c<19 or(c==19 and v<28) else 5 if c<=21 else 6 if c<=23 else 7
 return 0 if c==1 and v==1 else 2 if c<=4 else 3 if c<=6 else 4 if c<=11 else 5 if c==12 else 6 if c<=19 else 7
merge.update('拿撒勒人厌弃耶稣|耶稣的母亲和兄弟们|撒种的比喻|用比喻的目的|解明撒种的比喻|施洗约翰的门徒来见耶稣|谁最伟大|谴责文士|从无花果树学个比方|和门徒同度逾越节|要求神迹|求主显个神迹'.split('|'))
units=[];lookup={};seen={}
for s in [s for s in sections if s['book']!='ACT']:
 b=s['book'];c,v=map(int,s['verses'][0].split(':'));t=normalize.get(s['title'],s['title']);ph=phase(s);key=t if t in merge else b+':'+s['verses'][0];note=''
 if t=='拿撒勒人厌弃耶稣' and b=='LUK':key+=':luke4';note='路加把家乡拒绝置于事工开端；与太13、可6是否同次访问存在讨论，此处单列。'
 if t=='治好许多病人' and b=='MAT' and c==15:key+=':later'
 if t=='治好两个瞎子' and b=='MAT' and c==9:key+=':earlier'
 if t=='洁净圣殿' and b=='JHN':key+=':john2';note='约翰将洁殿放在事工初期；与受难周洁殿的关系有不同解释，此处不合并。'
 if t=='杀害耶稣的阴谋' and b=='JHN':key+=':john11'
 if t=='向门徒显现' and b=='JHN' and c==21:key+=':galilee'
 if b=='MRK' and c==16 and v>=9:key=b+':'+s['verses'][0];note='可16:9–20长结尾在重要早期抄本中缺少；本来源收录，保留为附录见证，不作唯一证据。'
 if b=='JHN' and (c==8 and v==1 or c==7 and v==53):note='约7:53–8:11的抄本位置与早期见证存在文本讨论；保留来源正文，并明确此界限。'
 # No two pericopes from the same Gospel are silently collapsed.
 if key in lookup and any(w['book']==b for w in lookup[key]['witnesses']) and not(t=='彼得三次不认主' and b=='JHN'):key+=':'+b+':'+s['verses'][0]
 if key not in lookup:
  u={'id':'h'+str(len(units)+1).zfill(3),'title':t,'phase':ph,'note':note,'witnesses':[]};lookup[key]=u;units.append(u)
 u=lookup[key];u['witnesses'].append(s)
 if note:u['note']=note
# Read in broad ministry stages. Ordering inside stages is editorial and does not invent daily dates.
for u in units:
 pref=next((w for w in u['witnesses'] if w['book']=='MRK'),u['witnesses'][0]);u['primary']=pref['book'];u['sort']=min(float(w['verses'][0].replace(':','.'))/(28 if w['book']=='MAT' else 16 if w['book']=='MRK' else 24 if w['book']=='LUK' else 21) for w in u['witnesses'])
# Explicit narrative anchors avoid chapter-length ratios reversing supper, trial and burial.
passion='杀害耶稣的阴谋|在伯大尼受膏|犹大出卖耶稣|和门徒同度逾越节|耶稣为门徒洗脚|预言自己将被出卖|设立主的晚餐|争论谁为大|新的命令|预言彼得不认主|钱囊、口袋、刀|耶稣是道路、真理、生命|应许赐圣灵|耶稣是真葡萄树|世人的憎恨|圣灵的工作|忧愁变为喜乐|我已经胜过世界|耶稣的祷告|在客西马尼祷告|耶稣被捕|逃走的少年人|耶稣被带到亚那面前|大祭司盘问耶稣|彼得三次不认主|耶稣在公会里受审|戏弄鞭打耶稣|耶稣被交给彼拉多|犹大的死|耶稣在彼拉多面前受审|希律藐视耶稣|耶稣被判死刑|兵丁戏弄耶稣|耶稣被钉十字架|耶稣的死|肋旁被扎|耶稣的安葬|封石妥守'.split('|')
resurrection='耶稣复活|向抹大拉的马利亚显现|看守的兵报告祭司长|在以马忤斯的路上|向两个门徒显现|向门徒显现|耶稣和多马|本书的目的|耶稣向七个门徒显现|耶稣和彼得|耶稣和他所爱的那门徒|门徒奉差遣|耶稣升天'.split('|')
def reading_order(u):
 order=passion if u['phase']==6 else resurrection if u['phase']==7 else []
 rank=order.index(u['title']) if u['title'] in order else len(order)+u['sort']
 return (u['phase'],rank if order else u['sort'])
units.sort(key=reading_order)
covered=[w['book']+':'+v for u in units for w in u['witnesses'] for v in w['verses']]
assert len(covered)==len(set(covered))==sum(len(records[b]['verses']) for b in codes[:4])
out=Path('assets/gospel-source');out.mkdir(exist_ok=True)
for code in codes:(out/(code+'.json')).write_text(json.dumps(records[code],ensure_ascii=False,separators=(',',':')))
meta={'source':'https://ebible.org/bible/details.php?id=cmn-cu89s','edition':'cmn-cu89s','license':'Public Domain as stated by source','retrieved':'2026-10-23','units':units,'verseCount':len(covered),'chapterCount':89,'sourceSections':len([s for s in sections if s['book']!='ACT'])}
Path('data/gospel-harmony-v2.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print({'units':len(units),'sourceSections':meta['sourceSections'],'coveredVerses':len(covered),'chapters':89,'ACT':len(records['ACT']['verses'])})
