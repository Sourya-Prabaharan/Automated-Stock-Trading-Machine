#include "RiskMetrics.h"
#include <cmath>
#include <numeric>

BacktestMetrics RiskMetrics::calculate(double initial_capital, 
                                     const std::vector<double>& equity_curve,
                                     const std::vector<TradeRecord>& trades,
                                     double benchmark_return_pct) {
    BacktestMetrics metrics;
    metrics.total_return_pct = 0.0;
    metrics.annualized_return_pct = 0.0;
    metrics.buy_and_hold_return_pct = benchmark_return_pct;
    metrics.max_drawdown_pct = 0.0;
    metrics.max_drawdown_duration_bars = 0;
    metrics.sharpe_ratio = 0.0;
    metrics.win_rate = 0.0;
    metrics.total_trades = 0;
    metrics.winning_trades = 0;
    metrics.losing_trades = 0;
    metrics.average_win = 0.0;
    metrics.average_loss = 0.0;
    metrics.profit_factor = 0.0;
    
    if (equity_curve.empty() || initial_capital <= 0.0) {
        return metrics;
    }

    // Returns
    double final_value = equity_curve.back();
    metrics.total_return_pct = ((final_value - initial_capital) / initial_capital) * 100.0;
    
    // Assume 252 trading days per year, estimate years based on equity curve length
    double years = equity_curve.size() / 252.0;
    if (years > 0.0) {
        metrics.annualized_return_pct = (std::pow(final_value / initial_capital, 1.0 / years) - 1.0) * 100.0;
    } else {
        metrics.annualized_return_pct = metrics.total_return_pct;
    }

    // Max Drawdown & Duration
    double peak = initial_capital;
    double max_dd = 0.0;
    int current_dd_duration = 0;
    int max_dd_duration = 0;
    
    for (double value : equity_curve) {
        if (value >= peak) {
            peak = value;
            current_dd_duration = 0;
        } else {
            current_dd_duration++;
            if (current_dd_duration > max_dd_duration) {
                max_dd_duration = current_dd_duration;
            }
        }
        
        double dd = (peak - value) / peak;
        if (dd > max_dd) {
            max_dd = dd;
        }
    }
    metrics.max_drawdown_pct = max_dd * 100.0;
    metrics.max_drawdown_duration_bars = max_dd_duration;

    // Sharpe Ratio
    std::vector<double> daily_returns;
    daily_returns.reserve(equity_curve.size());
    double prev_val = initial_capital;
    for (double val : equity_curve) {
        daily_returns.push_back((val - prev_val) / prev_val);
        prev_val = val;
    }

    if (daily_returns.size() > 1) {
        double mean_return = std::accumulate(daily_returns.begin(), daily_returns.end(), 0.0) / daily_returns.size();
        double variance = 0.0;
        for (double r : daily_returns) {
            variance += (r - mean_return) * (r - mean_return);
        }
        double std_dev = std::sqrt(variance / (daily_returns.size() - 1));
        
        // Annualized Sharpe (assuming 0 risk-free rate for simplicity)
        if (std_dev > 0.0) {
            metrics.sharpe_ratio = (mean_return / std_dev) * std::sqrt(252);
        }
    }

    // Trade stats
    double gross_profit = 0.0;
    double gross_loss = 0.0;
    
    for (const auto& trade : trades) {
        if (trade.side == OrderSide::SELL) {
            metrics.total_trades++;
            if (trade.realized_pnl > 0) {
                metrics.winning_trades++;
                gross_profit += trade.realized_pnl;
            } else {
                metrics.losing_trades++;
                gross_loss += std::abs(trade.realized_pnl);
            }
        }
    }

    if (metrics.total_trades > 0) {
        metrics.win_rate = (static_cast<double>(metrics.winning_trades) / metrics.total_trades) * 100.0;
    }
    
    if (metrics.winning_trades > 0) {
        metrics.average_win = gross_profit / metrics.winning_trades;
    }
    
    if (metrics.losing_trades > 0) {
        metrics.average_loss = gross_loss / metrics.losing_trades;
    }
    
    if (gross_loss > 0.0) {
        metrics.profit_factor = gross_profit / gross_loss;
    } else if (gross_profit > 0.0) {
        metrics.profit_factor = 999.0; // Infinite
    }

    return metrics;
}
