#pragma once

#include "Common.h"
#include <vector>

struct BacktestMetrics {
    double total_return_pct;
    double annualized_return_pct;
    double buy_and_hold_return_pct;
    double max_drawdown_pct;
    int max_drawdown_duration_bars;
    double sharpe_ratio;
    double win_rate;
    int total_trades;
    int winning_trades;
    int losing_trades;
    double average_win;
    double average_loss;
    double profit_factor;
};

class RiskMetrics {
public:
    static BacktestMetrics calculate(double initial_capital, 
                                   const std::vector<double>& equity_curve,
                                   const std::vector<TradeRecord>& trades,
                                   double benchmark_return_pct);
};
