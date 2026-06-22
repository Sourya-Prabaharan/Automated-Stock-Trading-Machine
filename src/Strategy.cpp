#include "Strategy.h"
#include <numeric>
#include <cmath>
#include <stdexcept>

namespace Indicators {

double sma(const std::vector<PriceBar>& data, int end_index, int period) {
    if (end_index < period - 1 || period <= 0) {
        return 0.0;
    }
    
    double sum = 0.0;
    for (int i = end_index - period + 1; i <= end_index; ++i) {
        sum += data[i].close;
    }
    return sum / period;
}

double rsi(const std::vector<PriceBar>& data, int end_index, int period) {
    if (end_index < period || period <= 0) {
        return 50.0; // Neutral RSI
    }
    
    double avg_gain = 0.0;
    double avg_loss = 0.0;
    
    // Initial calculation
    for (int i = end_index - period + 1; i <= end_index; ++i) {
        double change = data[i].close - data[i-1].close;
        if (change > 0) {
            avg_gain += change;
        } else {
            avg_loss -= change; // Make loss positive
        }
    }
    
    if (avg_gain == 0.0 && avg_loss == 0.0) {
        return 50.0; // No price movement
    }
    
    avg_gain /= period;
    avg_loss /= period;
    
    if (avg_loss == 0.0) {
        return 100.0;
    }
    
    double rs = avg_gain / avg_loss;
    return 100.0 - (100.0 / (1.0 + rs));
}

} // namespace Indicators

// ==========================================
// SMACrossover
// ==========================================

SMACrossover::SMACrossover(int short_period, int long_period)
    : short_period_(short_period), long_period_(long_period), has_position_(false) {
    if (short_period >= long_period) {
        throw std::invalid_argument("Short period must be less than long period");
    }
}

std::string SMACrossover::name() const {
    return "SMA Crossover (" + std::to_string(short_period_) + "/" + std::to_string(long_period_) + ")";
}

Signal SMACrossover::evaluate(int index, const std::vector<PriceBar>& data) {
    if (index < long_period_) {
        return Signal::HOLD;
    }
    
    double short_ma = Indicators::sma(data, index, short_period_);
    double long_ma = Indicators::sma(data, index, long_period_);
    
    double prev_short_ma = Indicators::sma(data, index - 1, short_period_);
    double prev_long_ma = Indicators::sma(data, index - 1, long_period_);
    
    // Check for crossover
    bool crossover_up = prev_short_ma <= prev_long_ma && short_ma > long_ma;
    bool crossover_down = prev_short_ma >= prev_long_ma && short_ma < long_ma;
    
    if (crossover_up && !has_position_) {
        has_position_ = true;
        return Signal::BUY;
    } else if (crossover_down && has_position_) {
        has_position_ = false;
        return Signal::SELL;
    }
    
    return Signal::HOLD;
}

void SMACrossover::reset() {
    has_position_ = false;
}

// ==========================================
// RSIMeanReversion
// ==========================================

RSIMeanReversion::RSIMeanReversion(int period, double oversold, double overbought)
    : period_(period), oversold_(oversold), overbought_(overbought), has_position_(false) {
}

std::string RSIMeanReversion::name() const {
    return "RSI Mean Reversion (" + std::to_string(period_) + ")";
}

Signal RSIMeanReversion::evaluate(int index, const std::vector<PriceBar>& data) {
    if (index < period_) {
        return Signal::HOLD;
    }
    
    double current_rsi = Indicators::rsi(data, index, period_);
    
    if (current_rsi < oversold_ && !has_position_) {
        has_position_ = true;
        return Signal::BUY;
    } else if (current_rsi > overbought_ && has_position_) {
        has_position_ = false;
        return Signal::SELL;
    }
    
    return Signal::HOLD;
}

void RSIMeanReversion::reset() {
    has_position_ = false;
}
