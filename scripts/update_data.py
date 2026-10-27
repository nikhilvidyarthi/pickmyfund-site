"""Refresh site/data.json for the PickMyFund Insights page.

Runs hourly from GitHub Actions during NSE hours (see .github/workflows/update-data.yml).
Source: Yahoo Finance via the yfinance library (free, unofficial, may be delayed).
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
    ("Gold (₹/10g)", "GOLD_INR", ""), ("Silver ($/oz)", "SI=F", ""), ("USD/INR", "INR=X", ""),
    ("S&P 500", "^GSPC", ""), ("Nasdaq 100", "^NDX", ""), ("India VIX", "^INDIAVIX", ""),
]
YEAR_SERIES = {"Nifty 50": "^NSEI", "Nifty Midcap 100": "NIFTY_MIDCAP_100.NS", "Nifty Smallcap 100": "^CNXSC",
               "Gold": "GOLD_INR", "S&P 500": "SPX_INR"}


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
        pg.wait_for_timeout(1500)
        heads = pg.eval_on_selector_all("table.dataTable thead th", "els => els.map(e => e.innerText.trim())")
        rows = pg.eval_on_selector_all("table.dataTable tbody tr", "trs => trs.map(r => Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim()))")
        b.close()
    h = [x.lower() for x in heads]
    def col(*keys, default=None):
        for i, x in enumerate(h):
            if all(k in x for k in keys):
                return i
        return default
    # default positions match the layout seen in Oct 2026: security, maturity, bid qty, bid yield, bid price,
    # offer price, offer yield, offer qty, LTP, LTY, last trade qty, total traded volume
    i_sec = col("desc") if col("desc") is not None else col("security", default=0)
    i_mat = col("matur", default=1)
    i_lty = col("lty") if col("lty") is not None else col("last", "yield", default=9)
    i_vol = col("total", default=11) if col("total") is not None else col("volume", default=11)
    best = None
    for r in rows:
        if len(r) <= max(i_sec, i_mat, i_lty, i_vol):
            continue
        try:
            mat = dt.datetime.strptime(r[i_mat], "%d/%m/%Y").date()
        except Exception:
            continue
        yrs = (mat - today).days / 365.25
        y, v = _num(r[i_lty]), _num(r[i_vol])
        if not (8.5 <= yrs <= 11) or not y or not v or not (2 < y < 15):
            continue
        if best is None or v > best[3]:
            best = (y, r[i_sec], str(mat), v)
    if not best:
        raise RuntimeError(f"no 10-year benchmark found among {len(rows)} rows (headers: {heads})")
    return best[0], best[1], best[2]


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


def main():
    prev = json.loads(OUT.read_text()) if OUT.exists() else {}
    log = []
    now = dt.datetime.now(IST)

    syms = sorted({s for _, s in INDICES + SECTORS} | {"SI=F", "INR=X", "^GSPC", "^NDX", "^INDIAVIX", "GC=F"})
    df = yf.download(syms, period="6y", interval="1d", group_by="ticker", auto_adjust=False, threads=True, progress=False)
    ser = {s: closes(df, s) for s in syms}
    inr = ser.get("INR=X")
    if ser.get("GC=F") is not None and inr is not None:  # international gold converted to ₹ per 10 g
        g = (ser["GC=F"] * inr.reindex(ser["GC=F"].index, method="ffill") / 31.1035 * 10).dropna()
        ser["GOLD_INR"] = g
    if ser.get("^GSPC") is not None and inr is not None:
        ser["SPX_INR"] = (ser["^GSPC"] * inr.reindex(ser["^GSPC"].index, method="ffill")).dropna()

    def build(lst, key, full):
        old = {x["name"]: x for x in prev.get(key, [])}
        out = []
        for name, s in lst:
            c = ser.get(s)
            if c is None or len(c) < 30:
                log.append(f"{key}: {name} ({s}) unavailable, kept previous")
                if name in old: out.append(old[name])
                continue
            out.append({"name": name, **metrics(c, highs(df, s), full)})
        return out

    data = {"indices": build(INDICES, "indices", True), "sectors": build(SECTORS, "sectors", False)}

    old_assets = {x["name"]: x for x in prev.get("assets", [])}
    assets = []
    for name, s, unit in ASSETS:
        c = ser.get(s)
        if c is None or len(c) < 30:
            log.append(f"assets: {name} unavailable, kept previous")
            if name in old_assets: assets.append(old_assets[name])
            continue
        m = metrics(c, None, False)
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
        bd = yf.download(tick, period="14mo", interval="1d", group_by="ticker", auto_adjust=False, threads=True, progress=False)
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
    last = nifty.index[-1].date() if nifty is not None else now.date()
    open_now = now.weekday() < 5 and dt.time(9, 15) <= now.time() <= dt.time(15, 30) and last == now.date()
    data.update({"as_of": str(last), "live": bool(open_now),
                 "snap_ist": now.strftime("%-I:%M %p IST").lower().replace(" ist", " IST") if open_now else "close",
                 "source": "Yahoo Finance via yfinance (may be delayed)"})
    data["warnings"] = log
    order = ["as_of", "live", "snap_ist", "source", "warnings", "indices", "sectors", "assets", "years", "breadth", "movers", "bond_meta", "bond_hist"]
    OUT.write_text(json.dumps({k: data.get(k) for k in order}, ensure_ascii=False, indent=1))
    print("as_of", data["as_of"], "live", data["live"], "| indices", len(data["indices"]), "sectors", len(data["sectors"]))
    for l in log: print("WARN", l)


if __name__ == "__main__":
    sys.exit(main())
