#!/bin/bash

# Exit on error
set -e

# Change to the directory containing this script, then go up to project root
cd "$(dirname "$0")/.."

echo "Building Trading Engine..."
mkdir -p build
cd build
cmake ..
make -j$(sysctl -n hw.logicalcpu || nproc)

echo ""
echo "Running SMA Crossover Strategy..."
./trading_engine ../data/sample_prices.csv --strategy sma

echo ""
echo "Running RSI Mean Reversion Strategy..."
./trading_engine ../data/sample_prices.csv --strategy rsi
