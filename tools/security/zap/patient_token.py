#!/usr/bin/env python3
"""Phase 16.8 - sign up a throw-away patient on the live stack and print its bearer token, so ZAP scans the
authenticated surface too:  python3 tools/security/zap/patient_token.py > zap-out/token.txt"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'live'))
import j_accounts  # noqa: E402

import contextlib  # noqa: E402

with contextlib.redirect_stdout(sys.stderr):   # the journey helpers print their steps; stdout must hold the token only
    token = j_accounts.app_signup(label='zap')['token']
if not token:
    sys.exit('could not sign up the ZAP patient')
print(token)
