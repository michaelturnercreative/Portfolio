#!/bin/zsh
set -e

portfolio_root="${0:A:h}"
cd "$portfolio_root"
python3 "tools/serve_portfolio.py" --open
