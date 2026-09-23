export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
OUT=/tmp/web_auth.json
DONE=$(python3 -c "import json,os;print('\n'.join(x['route'] for x in json.load(open('$OUT'))) if os.path.exists('$OUT') else '')")
P=$(cat /tmp/webauthroutes.txt | tr ',' '\n' | grep . | grep -vxF "$DONE" | head -7 | paste -sd,)
[ -z "$P" ] && echo DONE && exit 0
C="{\"nabd_access\":\"$(cat /home/claude/aud/ptok.txt)\"}"
timeout 290 python3 /home/claude/aud/shot.py "$P" $OUT "$C"
python3 -c "import json;print(len(json.load(open('$OUT'))))"
