#!/bin/bash
cd "$(dirname "$0")/.."
rm -f /tmp/t2.db /tmp/adm.txt
ANTHROPIC_API_KEY=sk-test SESSION_SECRET=testsecret DB_PATH=/tmp/t2.db PORT=3457 node server.js > /tmp/server2.log 2>&1 &
SP=$!; sleep 2
B=http://localhost:3457; J='-H Content-Type:application/json'
step(){ echo; echo "--- $1"; }
# sample files
node -e '
const {Document,Packer,Paragraph,HeadingLevel}=require("docx");const P=require("pptxgenjs");const fs=require("fs");
(async()=>{
 const d=new Document({sections:[{children:[new Paragraph({text:"Year-End Appeal Draft",heading:HeadingLevel.HEADING_1}),new Paragraph("Dear neighbor, right here on the coast, bold care is possible because of you."),new Paragraph("Second paragraph with the word together.")]}]});
 fs.writeFileSync("/tmp/sample.docx",await Packer.toBuffer(d));
 const p=new P();const s=p.addSlide();s.addText("Board Deck: Santa Ynez ER",{x:0.5,y:0.5,w:9,h:1});s.addText("Neighbors caring for neighbors",{x:0.5,y:1.5,w:9,h:1,bullet:true});
 const s2=p.addSlide();s2.addText("Slide two: the ask",{x:0.5,y:0.5,w:9,h:1});
 fs.writeFileSync("/tmp/sample.pptx",await p.write({outputType:"nodebuffer"}));
 fs.writeFileSync("/tmp/sample.txt","Plain text appeal copy. Hope rises here.");
 fs.writeFileSync("/tmp/sample.csv","name,gift\nA,100\nB,250");
 fs.writeFileSync("/tmp/sample.png",Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==","base64"));
 fs.writeFileSync("/tmp/sample.doc","old binary");
})();'
curl -s -c /tmp/adm.txt $J -X POST $B/api/register -d '{"email":"mike@accordantphilanthropy.com","password":"mikepass123","name":"Michael Beall","use":"Content development"}' > /dev/null
step "extract docx"; curl -s -b /tmp/adm.txt -F file=@/tmp/sample.docx $B/api/extract-file
step "extract pptx"; curl -s -b /tmp/adm.txt -F file=@/tmp/sample.pptx $B/api/extract-file
step "extract txt"; curl -s -b /tmp/adm.txt -F file=@/tmp/sample.txt $B/api/extract-file
step "extract csv"; curl -s -b /tmp/adm.txt -F file=@/tmp/sample.csv $B/api/extract-file
step "extract png"; curl -s -b /tmp/adm.txt -F file=@/tmp/sample.png $B/api/extract-file | cut -c1-120
step "extract legacy .doc"; curl -s -b /tmp/adm.txt -F file=@/tmp/sample.doc $B/api/extract-file
step "create project"; PJ=$(curl -s -b /tmp/adm.txt $J -X POST $B/api/create/projects -d '{"title":"Year-end appeal","brief":"Letter + email for lapsed donors"}'); echo $PJ; PID=$(echo $PJ | python3 -c "import sys,json;print(json.load(sys.stdin)['project']['id'])")
step "settings"; curl -s -b /tmp/adm.txt $J -X PUT $B/api/create/projects/$PID -d '{"settings":{"region":"valley","research":false,"personas":["walter","bogus"]}}'
step "upload files to project"; curl -s -b /tmp/adm.txt -F files=@/tmp/sample.docx -F files=@/tmp/sample.pptx -F files=@/tmp/sample.png -F files=@/tmp/sample.doc $B/api/create/projects/$PID/files | python3 -c "import sys,json;d=json.load(sys.stdin);print('added',[(a['name'],a['kind'],a['chars'],a['is_image']) for a in d['added']]);print('failed',d['failed'])"
step "chat (no real key -> expect stream error event)"; curl -s -N --max-time 25 -b /tmp/adm.txt $J -X POST $B/api/create/projects/$PID/chat -d '{"message":"Draft the letter"}' | head -c 600
step "project detail"; curl -s -b /tmp/adm.txt $B/api/create/projects/$PID | python3 -c "import sys,json;d=json.load(sys.stdin);print('msgs',[(m['role'],m['text'][:60]) for m in d['messages']]);print('files',[(f['name'],f['is_image']) for f in d['files']])"
step "save asset"; AS=$(curl -s -b /tmp/adm.txt $J -X POST $B/api/create/projects/$PID/assets -d '{"content":"# Year-End Letter\n\nDear neighbor,\n\nRight here, **together**, we made the Valley'"'"'s hospital stronger.\n\n## What your gift did\n\n- Kept the ER open all night\n- Brought a second nurse to triage\n\n## The ask\n\n1. Give again this year\n2. Bring a neighbor\n\n> A note from Dr. Rivera\n\n---\n\n## Slide-ish section\n\nClosing paragraph."}'); echo $AS | cut -c1-200; AID=$(echo $AS | python3 -c "import sys,json;print(json.load(sys.stdin)['asset']['id'])")
step "export docx/pptx/md"; for f in docx pptx md; do curl -s -b /tmp/adm.txt -o /tmp/out.$f -w "$f:%{http_code} %{size_download}b %{content_type}\n" "$B/api/create/assets/$AID/export?format=$f"; done
step "round-trip exports"; node -e '
const op=require("officeparser");const fs=require("fs");
(async()=>{ for(const f of ["docx","pptx"]){ const r=await op.parseOffice(fs.readFileSync("/tmp/out."+f),{}); console.log(f,"=>",JSON.stringify(r.toText()).slice(0,260)); } })();'
step "project export"; curl -s -b /tmp/adm.txt -o /tmp/proj.docx -w "proj docx:%{http_code} %{size_download}b\n" "$B/api/create/projects/$PID/export?format=docx"
step "asset update + list"; curl -s -b /tmp/adm.txt $J -X PUT $B/api/create/assets/$AID -d '{"title":"Renamed","kind":"letter"}' | cut -c1-120
step "delete project cascades"; curl -s -b /tmp/adm.txt -X DELETE $B/api/create/projects/$PID; curl -s -b /tmp/adm.txt -o /dev/null -w " asset after delete:%{http_code}\n" $B/api/create/assets/$AID
step "curate evaluate still works (expects API error, not crash)"; curl -s -b /tmp/adm.txt $J -X POST $B/api/evaluate -d '{"atype":"Other","copy":"hello","personaIds":["walter"]}' | cut -c1-200
echo; echo "--- server log"; cat /tmp/server2.log
kill $SP
