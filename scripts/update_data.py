"""Refresh site/data.json for the PickMyFund Insights page.

Runs hourly from GitHub Actions during NSE hours (see .github/workflows/update-data.yml).
Sources: Yahoo Finance via yfinance; NSE's daily index file (data/nse_index_eod.csv) for indices Yahoo lacks;
TradingView's public scanner for live Nifty Midcap 100 / Smallcap 100.
Anything that can't be fetched keeps its previous value from site/data.json, so a
partial outage never blanks the page.
"""
import json, math, sys, datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site" / "data.json"
IST = ZoneInfo("Asia/Kolkata")

INDICES = [  # name, yahoo symbol
    ("Nifty 50", "^NSEI"), ("Nifty Next 50", "^NSMIDCP"), ("Nifty Midcap 100", "NIFTY_MIDCAP_100.NS"),
    ("Nifty Midcap 150", "NIFTYMIDCAP150.NS"), ("Nifty Smallcap 100", "^CNXSC"), ("Nifty Smallcap 250", "NIFTYSMLCAP250.NS"),
    ("Nifty 500", "^CRSLDX"), ("Nifty Bank", "^NSEBANK"), ("Sensex", "^BSESN"),
]
SECTORS = [
    ("IT", "^CNXIT"), ("Pharma", "^CNXPHARMA"), ("Auto", "^CNXAUTO"), ("FMCG", "^CNXFMCG"), ("Metal", "^CNXMETAL"),
    ("Realty", "^CNXREALTY"), ("Energy", "^CNXENERGY"), ("PSU Banks", "^CNXPSUBANK"), ("Private Banks", "NIFTY_PVT_BANK.NS"),
    ("Financial Services", "NIFTY_FIN_SERVICE.NS"), ("Media", "^CNXMEDIA"), ("Infrastructure", "^CNXINFRA"), ("PSE", "^CNXPSE"),
    ("Consumption", "^CNXCONSUM"), ("Defence", "NIFTY_IND_DEFENCE.NS"), ("Commodities", "^CNXCMDT"),
    ("Healthcare", "NIFTY_HEALTHCARE.NS"), ("Oil & Gas", "NIFTY_OIL_AND_GAS.NS"), ("Consumer Durables", "NIFTY_CONSR_DURBL.NS"),
    ("Capital Markets", "NIFTY_CAPITAL_MKT.NS"), ("India Digital", "NIFTY_IND_DIGITAL.NS"), ("India Manufacturing", "NIFTY_INDIA_MFG.NS"),
]
ASSETS = [  # name, symbol, unit
    ("Gold ($/oz)", "GC=F", ""), ("Silver ($/oz)", "SI=F", ""), ("USD/INR", "INR=X", ""),
    ("S&P 500", "^GSPC", ""), ("Nasdaq 100", "^NDX", ""), ("India VIX", "^INDIAVIX", ""),
]
YEAR_SERIES = {"Nifty 50": "^NSEI", "Nifty Midcap 100": "NIFTY_MIDCAP_100.NS", "Nifty Smallcap 100": "^CNXSC",
               "Gold": "GOLD_INR", "S&P 500": "SPX_INR"}


def download(tickers, attempts=3, **kw):
    """yf.download with retries: Yahoo sometimes rate-limits GitHub's servers for a minute or two."""
    import time
    last = None
    for i in range(attempts):
        try:
            df = yf.download(tickers, group_by="ticker", auto_adjust=False, threads=True, progress=False, **kw)
            got = sum(1 for t in tickers if closes(df, t) is not None)
            if got >= max(1, len(tickers) // 2):
                return df
            last = f"only {got}/{len(tickers)} symbols returned"
        except Exception as e:
            last = str(e)
        time.sleep(30 * (i + 1))
    print("WARN download:", last)
    return df if 'df' in locals() else pd.DataFrame()


def r2(x):
    return None if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))) else round(float(x), 2)


def closes(df, sym):
    try:
        s = df[sym]["Close"] if isinstance(df.columns, pd.MultiIndex) else df["Close"]
        s = s.dropna()
        s.index = pd.to_datetime(s.index).tz_localize(None)
        return s if len(s) else None
    except Exception:
        return None


def highs(df, sym):
    try:
        s = df[sym]["High"].dropna(); s.index = pd.to_datetime(s.index).tz_localize(None); return s
    except Exception:
        return None


def thin(c):
    """Chart history: daily for the last ~13 months, every 5th session before that (keeps data.json small)."""
    days = [(d.date().toordinal() - 719163) for d in c.index]
    last = days[-1]
    keep = [i for i in range(len(days)) if days[i] > last - 400 or i % 5 == 0 or i == len(days) - 1]
    return {"t": [days[i] for i in keep], "c": [round(float(c.iloc[i]), 2) for i in keep]}


def ret_since(s, days=None, months=None, years=None):
    end = s.index[-1]
    start = end - (pd.Timedelta(days=days) if days else pd.DateOffset(months=months or 0, years=years or 0))
    base = s[s.index <= start]
    if not len(base):
        return None
    return (s.iloc[-1] / base.iloc[-1] - 1) * 100


def cagr(s, years):
    r = ret_since(s, years=years)
    return None if r is None else ((1 + r / 100) ** (1 / years) - 1) * 100


def ytd(s):
    prev = s[s.index < pd.Timestamp(year=s.index[-1].year, month=1, day=1)]
    return None if not len(prev) else (s.iloc[-1] / prev.iloc[-1] - 1) * 100


def metrics(c, h=None, full=True):
    hh = (h if h is not None else c)
    hi52 = hh[hh.index > c.index[-1] - pd.DateOffset(years=1)].max()
    o = {
        "close": r2(c.iloc[-1]), "d1": r2((c.iloc[-1] / c.iloc[-2] - 1) * 100) if len(c) > 1 else None,
        "w1": r2(ret_since(c, days=7)), "m1": r2(ret_since(c, months=1)), "m3": r2(ret_since(c, months=3)),
        "m6": r2(ret_since(c, months=6)), "ytd": r2(ytd(c)), "y1": r2(ret_since(c, years=1)),
        "offHigh": r2((c.iloc[-1] / hi52 - 1) * 100),
        "a50": bool(c.iloc[-1] > c.tail(50).mean()) if len(c) >= 50 else None,
        "a200": bool(c.iloc[-1] > c.tail(200).mean()) if len(c) >= 200 else None,
    }
    if full:
        o["y3"], o["y5"] = r2(cagr(c, 3)), r2(cagr(c, 5))
    return o


# ---------- India 10-year G-sec yield from CCIL NDS-OM Market Watch ----------
CCIL_URL = "https://www.ccilindia.com/market-watch"

def _num(x):
    try:
        return float(str(x).replace(",", "").strip())
    except Exception:
        return None

def fetch_ccil_10y(today):
    """Return (yield, security, maturity) for the most-traded central government bond
    maturing in 8.5–11 years, which is how the market identifies the 10-year benchmark."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36")
        pg.goto(CCIL_URL, wait_until="domcontentloaded", timeout=60000)
        for label in ["CG Mkt. Watch", "Central Government", "G-Sec"]:
            loc = pg.locator(f"text={label}").first
            if loc.count():
                loc.click(); break
        pg.wait_for_selector("table.dataTable tbody tr", timeout=30000)
        pg.wait_for_timeout(2500)
        tables = pg.evaluate("""() => Array.from(document.querySelectorAll('table.dataTable')).map(t => {
            const heads = Array.from(t.querySelectorAll('thead th')).map(e => e.textContent.trim());
            let rows = [];
            try { if (window.jQuery && jQuery.fn.dataTable && jQuery.fn.dataTable.isDataTable(t)) {
                rows = jQuery(t).DataTable().rows().data().toArray().map(r => (Array.isArray(r) ? r : Object.values(r))
                       .map(v => String(v).replace(/<[^>]*>/g, '').trim())); } } catch (e) {}
            if (!rows.length) rows = Array.from(t.querySelectorAll('tbody tr')).map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim()));
            return {heads, rows};
        })""")
        b.close()
    candidates = []
    for t in tables:
        y = _pick_benchmark(t["heads"], t["rows"], today)
        if y: candidates.append(y)
    if not candidates:
        sample = [t["rows"][:2] for t in tables][:3]
        raise RuntimeError(f"no 10-year GS bond found; tables={len(tables)}, rows={[len(t['rows']) for t in tables]}, sample={sample}")
    best = max(candidates, key=lambda x: x[3])
    return best[0], best[1], best[2]


def _parse_date(x):
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d-%b-%Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return dt.datetime.strptime(x.strip(), fmt).date()
        except Exception:
            pass
    return None


def _pick_benchmark(heads, rows, today):
    h = [x.lower() for x in heads]
    def col(*keys):
        for i, x in enumerate(h):
            if all(k in x for k in keys):
                return i
        return None
    i_sec = col("security") if col("security") is not None else 0
    i_mat = col("matur") if col("matur") is not None else 1
    i_lty = col("lty") if col("lty") is not None else 9
    i_vol = col("tta") if col("tta") is not None else (col("total") if col("total") is not None else 11)
    best = None
    for r in rows:
        if len(r) <= max(i_sec, i_mat, i_lty, i_vol):
            continue
        sec = r[i_sec]
        if " GS " not in f" {sec} ":          # central government dated securities only (not SDLs or T-bills)
            continue
        mat = _parse_date(r[i_mat])
        if not mat:
            continue
        yrs = (mat - today).days / 365.25
        y, v = _num(r[i_lty]), _num(r[i_vol])
        if not (8.5 <= yrs <= 11) or not y or not v or not (2 < y < 15):
            continue
        if best is None or v > best[3]:
            best = (y, sec, str(mat), v)
    return best


def bond_card(prev, now, log):
    old = next((a for a in prev.get("assets", []) if a["name"].startswith("India 10Y")), None)
    hist = dict(prev.get("bond_hist", {}))
    meta = prev.get("bond_meta", {})
    try:
        y, sec, mat = fetch_ccil_10y(now.date())
        hist[str(now.date())] = round(y, 4)
        meta = {"security": sec, "maturity": mat, "time": now.strftime("%-I:%M %p").lower(), "source": "CCIL NDS-OM"}
    except Exception as e:
        log.append(f"10Y yield: CCIL fetch failed ({e}); kept previous")
        if old is None:
            return None, hist, meta
    keys = sorted(hist)
    if not keys:
        return old, hist, meta
    last_d = keys[-1]; cur = hist[last_d]
    def at_or_before(d):
        ks = [k for k in keys if k <= d]
        return hist[ks[-1]] if ks else None
    ld = dt.date.fromisoformat(last_d)
    prev_day = next((hist[k] for k in reversed(keys) if k < last_d), None)
    m1 = at_or_before(str((pd.Timestamp(ld) - pd.DateOffset(months=1)).date()))
    y1 = at_or_before(str((pd.Timestamp(ld) - pd.DateOffset(years=1)).date()))
    ye = at_or_before(f"{ld.year - 1}-12-31")
    pp = lambda a: None if a is None else round(cur - a, 2)
    card = {"name": "India 10Y G-sec yield", "unit": "%", "close": round(cur, 3), "pp": pp(prev_day), "m1pp": pp(m1),
            "ytdpp": pp(ye), "y1pp": pp(y1), "d1": None, "m1": None, "y1": None,
            "note": f"{meta.get('security', '')} · {meta.get('source', 'CCIL')} {meta.get('time', '')}".strip()}
    cutoff = str((pd.Timestamp(ld) - pd.DateOffset(months=14)).date())
    hist = {k: v for k, v in hist.items() if k >= cutoff}
    return card, hist, meta


# ---------- Fallback for NSE indices that Yahoo doesn't carry: official history from niftyindices.com ----------
NSE_NAMES = {
    "Nifty Midcap 100": "NIFTY MIDCAP 100", "Nifty Smallcap 100": "NIFTY SMALLCAP 100", "Nifty Midcap 150": "NIFTY MIDCAP 150",
    "Nifty Smallcap 250": "NIFTY SMALLCAP 250", "Nifty Next 50": "NIFTY NEXT 50", "Nifty 500": "NIFTY 500",
    "Private Banks": "NIFTY PRIVATE BANK", "Media": "NIFTY MEDIA", "Defence": "NIFTY INDIA DEFENCE", "Commodities": "NIFTY COMMODITIES",
    "Healthcare": "NIFTY HEALTHCARE INDEX", "Oil & Gas": "NIFTY OIL & GAS", "Consumer Durables": "NIFTY CONSUMER DURABLES",
    "Capital Markets": "NIFTY CAPITAL MARKETS", "India Digital": "NIFTY INDIA DIGITAL", "India Manufacturing": "NIFTY INDIA MANUFACTURING",
    "IT": "NIFTY IT", "Pharma": "NIFTY PHARMA", "Auto": "NIFTY AUTO", "FMCG": "NIFTY FMCG", "Metal": "NIFTY METAL", "Realty": "NIFTY REALTY",
    "Energy": "NIFTY ENERGY", "PSU Banks": "NIFTY PSU BANK", "Financial Services": "NIFTY FINANCIAL SERVICES", "Infrastructure": "NIFTY INFRASTRUCTURE",
    "PSE": "NIFTY PSE", "Consumption": "NIFTY INDIA CONSUMPTION",
}
_NSE_SESSION = None

def nse_history(index_name, years=6):
    """Daily closes and highs for an NSE index from niftyindices.com (official NSE Indices site)."""
    import requests
    global _NSE_SESSION
    if _NSE_SESSION is None:
        _NSE_SESSION = requests.Session()
        _NSE_SESSION.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
                                     "Content-Type": "application/json; charset=UTF-8", "Accept": "application/json, text/javascript, */*; q=0.01",
                                     "X-Requested-With": "XMLHttpRequest", "Origin": "https://www.niftyindices.com",
                                     "Referer": "https://www.niftyindices.com/reports/historical-data"})
        try:
            _NSE_SESSION.get("https://www.niftyindices.com/reports/historical-data", timeout=20)
        except Exception:
            pass
    end = dt.date.today(); frames = []
    # the endpoint returns at most about a year per request, so walk back year by year
    for k in range(years):
        e = end - dt.timedelta(days=365 * k); st = e - dt.timedelta(days=364)
        cinfo = "{'name':'%s','startDate':'%s','endDate':'%s','indexName':'%s'}" % (
            index_name, st.strftime("%d-%b-%Y"), e.strftime("%d-%b-%Y"), index_name)
        r = _NSE_SESSION.post("https://www.niftyindices.com/Backpage.aspx/getHistoricaldatatabletoString",
                              data=json.dumps({"cinfo": cinfo}), timeout=30)
        r.raise_for_status()
        try:
            payload = r.json()["d"]
            rows = json.loads(payload) if isinstance(payload, str) else payload
        except Exception:
            raise RuntimeError(f"unexpected reply {r.status_code} {r.headers.get('content-type')}: {r.text[:160]!r}")
        if not rows:
            break
        frames.append(pd.DataFrame(rows))
    if not frames:
        raise RuntimeError("no rows")
    df = pd.concat(frames)
    cols = {c.upper(): c for c in df.columns}
    dcol = next(cols[c] for c in cols if "DATE" in c)
    ccol = next(cols[c] for c in cols if c == "CLOSE" or c.endswith("CLOSE"))
    hcol = next((cols[c] for c in cols if c == "HIGH" or c.endswith("HIGH")), ccol)
    idx = pd.to_datetime(df[dcol], dayfirst=True, errors="coerce")
    c = pd.Series(pd.to_numeric(df[ccol].astype(str).str.replace(",", ""), errors="coerce").values, index=idx).dropna()
    h = pd.Series(pd.to_numeric(df[hcol].astype(str).str.replace(",", ""), errors="coerce").values, index=idx).dropna()
    c = c[~c.index.duplicated()].sort_index(); h = h[~h.index.duplicated()].sort_index()
    return c, h


# ---------- NSE's own end-of-day file: closes for every NSE index, kept in data/nse_index_eod.csv ----------
EOD_FILE = ROOT / "data" / "nse_index_eod.csv"
EOD_URL = "https://nsearchives.nseindia.com/content/indices/ind_close_all_{:%d%m%Y}.csv"
_EOD = None

def eod_store(log):
    """Load the stored daily closes and add any sessions published since the last stored date."""
    global _EOD
    if _EOD is not None:
        return _EOD
    import csv, io, requests
    want = {v.upper() for v in NSE_NAMES.values()}
    df = pd.read_csv(EOD_FILE, parse_dates=["date"]) if EOD_FILE.exists() else pd.DataFrame(columns=["date", "index", "close", "high"])
    last = df["date"].max().date() if len(df) else dt.date.today() - dt.timedelta(days=30)
    today = dt.datetime.now(IST).date()
    new, d, tried = [], last + dt.timedelta(days=1), 0
    while d <= today and tried < 20:
        if d.weekday() < 5:
            tried += 1
            try:
                r = requests.get(EOD_URL.format(d), headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}, timeout=30)
                if r.status_code == 200 and r.text.startswith("Index Name"):
                    for row in csv.DictReader(io.StringIO(r.text)):
                        n = (row.get("Index Name") or "").strip().upper()
                        if n in want:
                            try:
                                c = float(row["Closing Index Value"]); h = float(row.get("High Index Value") or c)
                            except Exception:
                                continue
                            new.append({"date": pd.Timestamp(d), "index": n, "close": c, "high": h})
                elif r.status_code != 404 and d < today:
                    log.append(f"NSE daily file {d}: reply {r.status_code}")
            except Exception as e:
                log.append(f"NSE daily file {d}: {e}")
        d += dt.timedelta(days=1)
    if new:
        df = pd.concat([df, pd.DataFrame(new)]).drop_duplicates(["date", "index"], keep="last").sort_values(["index", "date"])
        out = df.copy(); out["date"] = out["date"].dt.strftime("%Y-%m-%d")
        out.to_csv(EOD_FILE, index=False, float_format="%.2f")
    _EOD = df
    return df


def eod_series(name, log):
    df = eod_store(log)
    sub = df[df["index"] == NSE_NAMES[name].upper()]
    if len(sub) < 30:
        return None, None
    c = pd.Series(sub["close"].astype(float).values, index=pd.to_datetime(sub["date"])).sort_index()
    h = pd.Series(sub["high"].astype(float).values, index=pd.to_datetime(sub["date"])).sort_index()
    return c, h


# Live intraday level for the two broad indices Yahoo lacks (TradingView's public scanner)
TV_LIVE = {"Nifty Midcap 100": "NSE:CNXMIDCAP", "Nifty Smallcap 100": "NSE:CNXSMALLCAP"}

def tv_live(log):
    import requests
    try:
        r = requests.post("https://scanner.tradingview.com/india/scan", timeout=20,
                          json={"symbols": {"tickers": list(TV_LIVE.values())}, "columns": ["close", "high"]})
        got = {x["s"]: x["d"] for x in r.json().get("data", [])}
        return {n: got[s] for n, s in TV_LIVE.items() if s in got and got[s][0]}
    except Exception as e:
        log.append(f"TradingView live quotes: {e}")
        return {}


def main():
    prev = json.loads(OUT.read_text()) if OUT.exists() else {}
    log = []
    now = dt.datetime.now(IST)

    syms = sorted({s for _, s in INDICES + SECTORS} | {"SI=F", "INR=X", "^GSPC", "^NDX", "^INDIAVIX", "GC=F"})
    df = download(syms, period="6y", interval="1d")
    ser = {s: closes(df, s) for s in syms}
    inr = ser.get("INR=X")
    if ser.get("GC=F") is not None and inr is not None:  # international gold converted to ₹ per 10 g
        g = (ser["GC=F"] * inr.reindex(ser["GC=F"].index, method="ffill") / 31.1035 * 10).dropna()
        ser["GOLD_INR"] = g
    if ser.get("^GSPC") is not None and inr is not None:
        ser["SPX_INR"] = (ser["^GSPC"] * inr.reindex(ser["^GSPC"].index, method="ffill")).dropna()

    sources = {}
    live = tv_live(log)
    hist = dict(prev.get("hist") or {})

    def build(lst, key, full):
        old = {x["name"]: x for x in prev.get(key, [])}
        out = []
        for name, s in lst:
            c, h = ser.get(s), highs(df, s)
            stale = c is not None and len(c) > 30 and ser.get("^NSEI") is not None and c.index[-1] < ser["^NSEI"].index[-1]
            yahoo_ok = ser.get("^NSEI") is not None
            eod_flag = None
            if (c is None or len(c) < 30 or stale) and name in NSE_NAMES:
                c, h = eod_series(name, log)
                if c is not None:
                    sources[name] = "NSE daily file"
                    today = pd.Timestamp(now.date())
                    if name in live and c.index[-1] < today and now.weekday() < 5 and now.hour >= 9:
                        c = pd.concat([c, pd.Series([float(live[name][0])], index=[today])])
                        h = pd.concat([h, pd.Series([float(live[name][1] or live[name][0])], index=[today])])
                        sources[name] = "NSE daily file + TradingView live"
                    ref = ser["^NSEI"].index[-1] if ser.get("^NSEI") is not None else today
                    if c.index[-1] < ref:
                        eod_flag = c.index[-1].strftime("%-d %b")
                else:
                    log.append(f"{key}: {name} missing from the NSE daily file store")
            if c is None or len(c) < 30:
                log.append(f"{key}: {name} ({s}) unavailable, kept previous")
                if name in old: out.append(old[name])
                continue
            row = {"name": name, **metrics(c, h, full)}
            if eod_flag: row["asof"] = eod_flag
            out.append(row)
            if key == "indices":
                hist[name] = thin(c[c.index > c.index[-1] - pd.DateOffset(years=5, days=7)])
        return out

    data = {"indices": build(INDICES, "indices", True), "sectors": build(SECTORS, "sectors", False)}

    old_assets = {x["name"]: x for x in prev.get("assets", [])}
    assets = []
    for name, s, unit in ASSETS:
        c = ser.get(s)
        if c is None or len(c) < 30:
            log.append(f"assets: {name} unavailable, kept previous")
            key0 = name.split(" (")[0]
            prev_card = old_assets.get(name) or next((v for k, v in old_assets.items() if k.split(" (")[0] == key0), None)
            if prev_card: assets.append(prev_card)
            continue
        m = metrics(c, None, False)
        if s in ("GC=F", "^GSPC"):
            hist[name] = thin(c[c.index > c.index[-1] - pd.DateOffset(years=5, days=7)])
        assets.append({"name": name, "unit": unit, **{k: m[k] for k in ("close", "d1", "w1", "m1", "ytd", "y1")}})
    bc, bond_hist, bond_meta = bond_card(prev, now, log)
    if bc:
        assets.insert(3, bc)
    data["assets"] = assets
    data["bond_hist"], data["bond_meta"] = bond_hist, bond_meta

    # breadth (Nifty 500) and movers (Nifty 50)
    to_y = lambda s: s.replace("_", "-") + ".NS"
    n500 = pd.read_csv(ROOT / "data" / "nifty500.csv")["symbol"].tolist()
    n50 = pd.read_csv(ROOT / "data" / "nifty50.csv")["symbol"].tolist()
    try:
        tick = sorted({to_y(s) for s in n500 + n50})
        bd = download(tick, period="14mo", interval="1d")
        adv = dec = unch = a50 = a200 = n50c = n200c = nh = nl = tot = 0
        rows = {}
        for s in n500:
            c = closes(bd, to_y(s))
            if c is None or len(c) < 2: continue
            tot += 1
            ch = c.iloc[-1] / c.iloc[-2] - 1
            adv += ch > 0; dec += ch < 0; unch += ch == 0
            if len(c) >= 50: n50c += 1; a50 += c.iloc[-1] > c.tail(50).mean()
            if len(c) >= 200: n200c += 1; a200 += c.iloc[-1] > c.tail(200).mean()
            yr = c[c.index > c.index[-1] - pd.DateOffset(years=1)]
            nh += c.iloc[-1] >= yr.max() * 0.99; nl += c.iloc[-1] <= yr.min() * 1.01
        if tot >= 300:
            data["breadth"] = {"adv": int(adv), "dec": int(dec), "unch": int(unch), "p50": r2(a50 / max(n50c, 1) * 100),
                               "p200": r2(a200 / max(n200c, 1) * 100), "nh": int(nh), "nl": int(nl), "total": int(tot)}
        else:
            raise RuntimeError(f"only {tot} breadth names")
        for s in n50:
            c = closes(bd, to_y(s))
            if c is not None and len(c) > 1:
                rows[s] = {"sym": s.replace("_", "-"), "name": "", "close": r2(c.iloc[-1]), "chg": r2((c.iloc[-1] / c.iloc[-2] - 1) * 100)}
        mv = sorted(rows.values(), key=lambda x: x["chg"])
        if len(mv) >= 30:
            data["movers"] = {"up": mv[::-1][:5], "down": mv[:5]}
        else:
            raise RuntimeError("movers incomplete")
    except Exception as e:
        log.append(f"breadth/movers: {e}; kept previous")
        data.setdefault("breadth", prev.get("breadth"))
        data.setdefault("movers", prev.get("movers"))

    # calendar years: past years are fixed; refresh the current-year column
    years = prev.get("years")
    if years:
        labels = years["years"]; cur = now.year
        if not any(str(cur) in l for l in labels):  # new year: finalise last year's YTD and open a new column
            labels[-1] = labels[-1].replace(" YTD", "")
            labels.append(f"{cur} YTD")
            for sr in years["series"]: sr["vals"].append(None)
            years["dd"].append(None)
        # gold and S&P 500 in rupees: rebuild every year from one source so the row is consistent
        for sr in years["series"]:
            src = YEAR_SERIES.get(sr["name"], "")
            if src in ("GOLD_INR", "SPX_INR"):
                try:
                    lng = download(["GC=F", "^GSPC", "INR=X"], period="12y", interval="1mo")
                    fx = closes(lng, "INR=X"); base = closes(lng, "GC=F" if src == "GOLD_INR" else "^GSPC")
                    if fx is None or base is None:
                        raise RuntimeError("monthly history unavailable")
                    v = (base * fx.reindex(base.index, method="ffill")).dropna()
                    ye = v.groupby(v.index.year).last()
                    for i, lab in enumerate(labels):
                        yv = int(lab[:4])
                        if yv in ye.index and (yv - 1) in ye.index:
                            sr["vals"][i] = r2((ye[yv] / ye[yv - 1] - 1) * 100)
                    sr["note"] = "international price, in ₹" if src == "GOLD_INR" else "in ₹"
                except Exception as e:
                    log.append(f"years: {sr['name']} rebuild failed ({e})")
        for sr in years["series"]:
            c = ser.get(YEAR_SERIES.get(sr["name"], ""))
            if c is not None and len(c) > 30:
                sr["vals"][-1] = r2(ytd(c))
                if len(labels) >= 2 and labels[-2].isdigit():  # keep the just-finished year accurate in early January
                    y = int(labels[-2]); a = c[c.index.year < y]; b = c[c.index.year <= y]
                    if len(a) and len(b) and sr["vals"][-2] is None: sr["vals"][-2] = r2((b.iloc[-1] / a.iloc[-1] - 1) * 100)
        c = ser.get("^NSEI")
        if c is not None:
            yc = c[c.index.year == c.index[-1].year]
            years["dd"][-1] = r2(((yc / yc.cummax()) - 1).min() * 100)
        data["years"] = years

    nifty = ser.get("^NSEI")
    last = nifty.index[-1].date() if nifty is not None else dt.date.fromisoformat(prev.get("as_of", str(now.date())))
    open_now = now.weekday() < 5 and dt.time(9, 15) <= now.time() <= dt.time(15, 30) and last == now.date()
    data.update({"as_of": str(last), "live": bool(open_now),
                 "snap_ist": now.strftime("%-I:%M %p IST").lower().replace(" ist", " IST") if open_now else "close",
                 "source": "Yahoo Finance via yfinance (may be delayed)"})
    if sources:
        log.append("from niftyindices.com: " + ", ".join(sorted(sources)))
    data["hist"] = hist
    data["warnings"] = log
    order = ["as_of", "live", "snap_ist", "source", "warnings", "indices", "sectors", "assets", "years", "breadth", "movers", "bond_meta", "bond_hist", "hist"]
    OUT.write_text(json.dumps({k: data.get(k) for k in order}, ensure_ascii=False, indent=1))
    print("as_of", data["as_of"], "live", data["live"], "| indices", len(data["indices"]), "sectors", len(data["sectors"]))
    for l in log: print("WARN", l)


if __name__ == "__main__":
    sys.exit(main())
