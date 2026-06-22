#pragma once

#include "Common.h"
#include <string>
#include <vector>

namespace Indicators {
    // Calculates Simple Moving Average
    double sma(const std::vector<PriceBar>& data, int end_index, int period);
    
    // Calculates Relative Strength Index
    double rsi(const std::vector<PriceBar>& data, int end_index, int period);
}

class Strategy {
public:
    virtual ~Strategy() = default;
    
    virtual std::string name() const = 0;
    
    // Evaluates the strategy at a specific point in time
    // index is the current bar being evaluated
    virtual Signal evaluate(int index, const std::vector<PriceBar>& data) = 0;
    
    // Reset any internal state between backtest runs
    virtual void reset() = 0;
};

class SMACrossover : public Strategy {
public:
    SMACrossover(int short_period = 10, int long_period = 30);
    
    std::string name() const override;
    Signal evaluate(int index, const std::vector<PriceBar>& data) override;
    void reset() override;

private:
    int short_period_;
    int long_period_;
    bool has_position_;
};

class RSIMeanReversion : public Strategy {
public:
    RSIMeanReversion(int period = 14, double oversold = 30.0, double overbought = 70.0);
    
    std::string name() const override;
    Signal evaluate(int index, const std::vector<PriceBar>& data) override;
    void reset() override;

private:
    int period_;
    double oversold_;
    double overbought_;
    bool has_position_;
};
