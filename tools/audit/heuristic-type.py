#!/usr/bin/env python3
"""Name-heuristic typer for DTO `any` props with no usage signals.
ONLY touches `x?: any` with bare @IsOptional (no other validator).
Infers from prop name; unknown names -> @IsObject + unknown? NO: leaves them
for manual review (prints UNRESOLVED). Usage: heuristic-type.py [--apply]"""
import re, glob, sys

APPLY = '--apply' in sys.argv
ROOT = 'backend/src'

STR = {'id', 'code', 'token', 'key', 'slug', 'phone', 'email', 'name', 'title', 'description', 'notes', 'note', 'reason', 'message', 'address', 'city', 'country', 'currency', 'status', 'state', 'type', 'kind', 'role', 'lang', 'locale', 'url', 'image', 'avatar', 'icon', 'color', 'reference', 'number', 'order_id', 'user_id', 'patient_id', 'provider_id', 'doctor_id', 'booking_id', 'appointment_id', 'session_id', 'device_id', 'label', 'value_string', 'ar', 'en', 'password', 'gender', 'specialty', 'nationality', 'company', 'district', 'license', 'visibility', 'salary', 'range', 'signer', 'role', 'signature', 'last4', 'cardnumber', 'card', 'text', 'body', 'subject', 'unit'}
NUM = {'count', 'amount', 'price', 'qty', 'quantity', 'limit', 'page', 'size', 'total', 'score', 'rating', 'percent', 'percentage', 'fee', 'cost', 'balance', 'points', 'level', 'priority_num', 'duration', 'timeout', 'latitude', 'longitude', 'lat', 'lng', 'years', 'experience', 'minutes', 'seconds', 'hours', 'days', 'months', 'index', 'version', 'size'}
BOOL = {'active', 'enabled', 'available', 'visible', 'verified', 'approved', 'confirmed', 'public', 'is_active', 'is_default', 'notify', 'subscribe', 'has', 'own', 'drivers', 'is', 'has_own_drivers'}
ARR = {'ids', 'list', 'items', 'tags', 'images', 'files', 'documents', 'roles', 'permissions', 'categories', 'options', 'choices', 'members', 'keys'}
DATE = {'at', 'date', 'time', 'since', 'until', 'from', 'to', 'birthday', 'dob', 'expiry', 'deadline'}
OBJ = {'address', 'location', 'data', 'meta', 'metadata', 'config', 'settings', 'params', 'filter', 'payload', 'context'}

def guess(name):
    n = name.lower()
    base = re.sub(r'(list|ids|_at|_date|_time|_id|_url|_uri|_count|_total|_amount|_price|_fee|_ids)$', '', n)
    if n in BOOL or base in BOOL: return ('IsBoolean', 'boolean')
    if n in NUM or base in NUM or n.endswith(('_count', '_total', '_amount', '_price', '_fee', '_minutes', '_seconds', '_hours', '_days')): return ('IsNumber', 'number')
    if n in ARR or n.endswith(('_ids', '_list', 's_list')) or (n.endswith('s') and base + 's' == n and len(n) > 4): return ('IsArray', 'unknown[]')
    if n in DATE or n.endswith(('_at', '_date', '_time')): return ('IsDateString', 'string')
    if n in OBJ: return ('IsObject', 'Record<string, unknown>')
    if n in STR or base in STR or n.endswith(('_id', '_code', '_token', '_key', '_slug', '_url', '_uri', '_name', '_title', '_phone', '_email', '_type', '_status', '_state', '_role', '_label', '_ar', '_en', '_password')): return ('IsString', 'string')
    # component fallback: any underscore part matching a known set
    parts = set(n.split('_'))
    if parts & {'price', 'amount', 'count', 'total', 'qty', 'quantity', 'fee', 'cost', 'balance', 'points', 'score', 'rating', 'percent', 'years', 'experience', 'number', 'index', 'version', 'limit', 'size', 'duration', 'minutes', 'seconds', 'hours', 'days'}: return ('IsNumber', 'number')
    if parts & {'name', 'title', 'text', 'body', 'subject', 'message', 'notes', 'note', 'reason', 'label', 'password', 'gender', 'specialty', 'nationality', 'company', 'district', 'license', 'visibility', 'salary', 'phone', 'email', 'address', 'city', 'status', 'state', 'type', 'role', 'url', 'unit'}: return ('IsString', 'string')
    if parts & {'active', 'enabled', 'available', 'visible', 'verified', 'confirmed', 'drivers'}: return ('IsBoolean', 'boolean')
    return None

changed = unresolved = 0
for f in sorted(glob.glob(ROOT + '/**/*.dto.ts', recursive=True)):
    s = open(f, encoding='utf8').read()
    out = []
    file_changed = False
    lines = s.split('\n')
    i = 0
    while i < len(lines):
        m = re.match(r'^(\s*)@IsOptional\(\)\s*$', lines[i])
        if m and i + 1 < len(lines):
            m2 = re.match(r'^(\s*)(\w+)\?:\s*any;\s*$', lines[i + 1])
            if m2:
                g = guess(m2.group(2))
                if g:
                    dec, ts = g
                    out.append(m.group(1) + '@IsOptional()')
                    out.append(m.group(1) + f'@{dec}()')
                    out.append(f"{m2.group(1)}{m2.group(2)}?: {ts};")
                    i += 2
                    file_changed = True
                    changed += 1
                    continue
                else:
                    unresolved += 1
                    print(f'UNRESOLVED {f}:{i + 2}: {m2.group(2)}')
        out.append(lines[i])
        i += 1
    if file_changed and APPLY:
        text = '\n'.join(out)
        m = re.search(r"import \{([^}]*)\} from 'class-validator';", text)
        if m:
            have = set(x.strip() for x in m.group(1).split(',') if x.strip())
            need = set(re.findall(r'@(\w+)\(', text))
            KNOWN = {'IsString','IsNumber','IsBoolean','IsArray','IsIn','IsOptional','IsDefined','IsEmail','IsUUID','IsEnum','IsInt','IsPositive','IsDateString','IsObject','IsNotEmpty','Min','Max','MinLength','MaxLength','Matches','IsPhoneNumber','IsMongoId','IsUrl','IsISO8601','ValidateNested','ArrayMinSize','ArrayMaxSize'}
            text = text[:m.start()] + 'import { ' + ', '.join(sorted((have | need) & KNOWN)) + " } from 'class-validator';" + text[m.end():]
        open(f, 'w', encoding='utf8').write(text)
print(f'typed: {changed}, unresolved: {unresolved}')
