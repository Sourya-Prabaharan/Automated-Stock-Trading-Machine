#pragma once

#include "Common.h"
#include "Strategy.h"
#include "RiskMetrics.h"

struct BacktestConfig {
    double initial_capital = 100000.0;
    double commission_rate = 0.001;
    int position_size = 100; // Fixed number of shares to trade
    std::string symbol = "AAPL";
};

struct BacktestResult {
    double initial_capital;
    double final_value;
    BacktestMetrics metrics;
    std::vector<TradeRecord> trades;
    std::vector<double> equity_curve;
};

class Backtester {
public:
    Backtester(const BacktestConfig& config);
    
    BacktestResult run(const std::vector<PriceBar>& data, Strategy& strategy);

private:
    BacktestConfig config_;
};
