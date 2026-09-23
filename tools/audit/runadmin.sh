export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
DONE=$(python3 -c "import json;print('\n'.join(x['page'] for x in json.load(open('/tmp/admin_res.json'))))")
P=$(tr ',' '\n' < /tmp/apages.txt | grep . | grep -vxF "$DONE" | head -12 | paste -sd,)
[ -z "$P" ] && echo ALLDONE && exit 0
timeout 285 python3 /home/claude/aud/adminshot.py "$P" /tmp/admin_res.json
python3 -c "import json;print(len(json.load(open('/tmp/admin_res.json'))))"
