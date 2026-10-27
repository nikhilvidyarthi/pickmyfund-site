# pickmyfund.com site

Static site for PickMyFund, hosted on Netlify. The Insights page reads `site/data.json`,
which a GitHub Action refreshes every hour while the NSE is open.

## How it works
- `site/` is what Netlify publishes (`index.html`, `insights.html`, `data.json`).
- `.github/workflows/update-data.yml` runs `scripts/update_data.py` at 9:20, 10:20 … 3:20 pm IST
  and again at 3:45 pm IST for closing numbers, Monday to Friday. If prices changed it commits
  `site/data.json`, and Netlify redeploys automatically.
- `data/nifty500.csv` and `data/nifty50.csv` are the constituent lists used for breadth and movers.
  Update them when NSE rebalances the indices (March and September).

## Run it yourself
- GitHub → Actions → "Update market data" → **Run workflow** refreshes the data immediately.
- Locally: `pip install -r requirements.txt && python scripts/update_data.py`

## Notes
- Data comes from Yahoo Finance through the `yfinance` library: free and unofficial, prices can be
  delayed by up to 15 minutes, and Yahoo's terms limit commercial use. For the public launch, switch
  `update_data.py` to a licensed feed (NSE or a data vendor); the page itself won't need changes.
- If a symbol fails, the script keeps its previous value and logs a warning in the Action run.
- GitHub may start scheduled runs a few minutes late, and it pauses schedules on repositories with
  no activity for 60 days (the hourly commits count as activity).
