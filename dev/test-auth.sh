#!/bin/bash
# runs the server and exercises the auth + admin API in one go
cd "$(dirname "$0")/.."
rm -f /tmp/t.db /tmp/kate.txt /tmp/sam.txt
ANTHROPIC_API_KEY=sk-test SESSION_SECRET=testsecret DB_PATH=/tmp/t.db PORT=3456 node server.js > /tmp/server.log 2>&1 &
SP=$!; sleep 2
B=http://localhost:3456; J='-H Content-Type:application/json'
step(){ echo; echo "--- $1"; }
step "unknown email"; curl -s $J -X POST $B/api/login -d '{"email":"nobody@x.org","password":"x"}'
step "invited admin (Kate) no pw yet"; curl -s $J -X POST $B/api/login -d '{"email":"K1Greene@sbch.org","password":"x"}'
step "register Kate (invited: no code needed)"; curl -s -c /tmp/kate.txt $J -X POST $B/api/register -d '{"email":"k1greene@sbch.org","password":"katepass123","name":"Kate Greene","role":"Leadership / Executive","use":"Content development"}'
step "me"; curl -s -b /tmp/kate.txt $B/api/me
step "self signup wrong code"; curl -s $J -X POST $B/api/register -d '{"email":"staff@cottagehealth.org","password":"staffpass1","name":"Sam Staff","accessCode":"wrong"}'
step "self signup right code"; curl -s -c /tmp/sam.txt $J -X POST $B/api/register -d '{"email":"staff@cottagehealth.org","password":"staffpass1","name":"Sam Staff","accessCode":"cottage2026","use":"Grant writing"}'
step "sam config user"; curl -s -b /tmp/sam.txt $B/api/config | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['user'])"
step "sam blocked from admin/create/stats"; curl -s -b /tmp/sam.txt $B/api/admin/users; echo; curl -s -b /tmp/sam.txt $B/api/create/projects; echo; curl -s -b /tmp/sam.txt -o /dev/null -w "stats:%{http_code}" $B/api/stats
step "wrong password"; curl -s $J -X POST $B/api/login -d '{"email":"k1greene@sbch.org","password":"nope"}'
step "login ok"; curl -s -c /tmp/kate.txt $J -X POST $B/api/login -d '{"email":"k1greene@sbch.org","password":"katepass123"}'
step "admin list"; curl -s -b /tmp/kate.txt $B/api/admin/users | python3 -c "import sys,json;d=json.load(sys.stdin);[print(u['email'],u['tier'],u['hasPassword']) for u in d['users']]; print('code:',d['accessCode'])"
step "admin adds + promotes + resets sam"; curl -s -b /tmp/kate.txt $J -X POST $B/api/admin/users -d '{"email":"new@cottagehealth.org","name":"New Person","tier":"curate"}'; curl -s -b /tmp/kate.txt $J -X PUT $B/api/admin/users/staff@cottagehealth.org -d '{"tier":"admin"}'; curl -s -b /tmp/kate.txt -X POST $B/api/admin/users/staff@cottagehealth.org/reset
step "sam old cookie now invalid; login says setup"; curl -s -b /tmp/sam.txt -o /dev/null -w "me:%{http_code} " $B/api/me; curl -s $J -X POST $B/api/login -d '{"email":"staff@cottagehealth.org","password":"staffpass1"}'
step "profile update"; curl -s -b /tmp/kate.txt $J -X PUT $B/api/me -d '{"name":"Kate G.","lean":"creative"}'
step "password change"; curl -s -b /tmp/kate.txt -c /tmp/kate.txt $J -X POST $B/api/me/password -d '{"current":"katepass123","next":"newpass12345"}'; curl -s -b /tmp/kate.txt -o /dev/null -w " me:%{http_code}" $B/api/me
step "cannot demote self"; curl -s -b /tmp/kate.txt $J -X PUT $B/api/admin/users/k1greene@sbch.org -d '{"tier":"curate"}'
echo; echo "--- server log"; cat /tmp/server.log
kill $SP
