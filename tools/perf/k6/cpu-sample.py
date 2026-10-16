"""CPU of named processes, every 2 s, as percent of one core (from /proc, so it is the current use, not ps's lifetime
average). Prints one line per sample: "<node%> <mongod%>". Used by ladder.sh; runs until killed."""
import os, sys, time

NAMES = sys.argv[1:] or ['node', 'mongod']
TICK = os.sysconf('SC_CLK_TCK')


def ticks():
    out = dict.fromkeys(NAMES, 0)
    for pid in filter(str.isdigit, os.listdir('/proc')):
        try:
            with open(f'/proc/{pid}/stat') as f:
                stat = f.read()
        except OSError:
            continue
        name = stat[stat.index('(') + 1:stat.rindex(')')]
        # /proc names are cut at 15 characters (mongod-x64-ubu for a mongodb-memory-server binary): match the start
        name = next((n for n in NAMES if name.startswith(n)), None)
        if name:
            fields = stat[stat.rindex(')') + 2:].split()
            out[name] += int(fields[11]) + int(fields[12])  # utime + stime
    return out


prev, t0 = ticks(), time.time()
while True:
    time.sleep(2)
    cur, t1 = ticks(), time.time()
    print(' '.join(str(round(100 * max(cur[n] - prev[n], 0) / TICK / (t1 - t0))) for n in NAMES), flush=True)
    prev, t0 = cur, t1
