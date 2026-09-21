#!/bin/zsh
set -e

portfolio_root="${0:A:h}"
cd "$portfolio_root"
python3 "tools/sync_portfolio_images.py"

echo
echo "Done. Refresh the portfolio in your browser to see the changes."
read -k 1 "?Press any key to close this window."
echo
