/**
 * Titan Quant Engine - Client-Side Simulation Core
 * JavaScript demonstration inspired by the C++17 Trading Engine; parity is not guaranteed
 * 
 * Features:
 * - Deterministic sequential evaluation (zero lookahead bias)
 * - Exact portfolio ledger and commission modeling
 * - Institutional risk metrics (Sharpe, Max Drawdown, Sortino, Win Rate, Profit Factor)
 * - Multiple strategies: SMA Crossover, RSI Mean Reversion, MACD Momentum, Bollinger Breakout
 * - Step-by-step playback engine for live streaming visualization
 */

const Indicators = {
  sma(data, endIndex, period) {
    if (endIndex < period - 1 || period <= 0) return null;
    let sum = 0.0;
    for (let i = endIndex - period + 1; i <= endIndex; ++i) {
      sum += data[i].close;
    }
    return sum / period;
  },

  ema(data, endIndex, period, smoothing = 2) {
    if (endIndex < period - 1 || period <= 0) return null;
    let k = smoothing / (period + 1);
    // Base SMA for first period
    let sum = 0.0;
    for (let i = 0; i < period; ++i) {
      sum += data[i].close;
    }
    let currentEma = sum / period;
    for (let i = period; i <= endIndex; ++i) {
      currentEma = data[i].close * k + currentEma * (1 - k);
    }
    return currentEma;
  },

  rsi(data, endIndex, period) {
    if (endIndex < period || period <= 0) return 50.0;
    let avgGain = 0.0;
    let avgLoss = 0.0;
    for (let i = endIndex - period + 1; i <= endIndex; ++i) {
      let change = data[i].close - data[i - 1].close;
      if (change > 0) {
        avgGain += change;
      } else {
        avgLoss -= change;
      }
    }
    if (avgGain === 0.0 && avgLoss === 0.0) return 50.0;
    avgGain /= period;
    avgLoss /= period;
    if (avgLoss === 0.0) return 100.0;
    let rs = avgGain / avgLoss;
    return 100.0 - (100.0 / (1.0 + rs));
  },

  bollingerBands(data, endIndex, period = 20, multiplier = 2.0) {
    if (endIndex < period - 1 || period <= 0) return null;
    let mean = this.sma(data, endIndex, period);
    let varianceSum = 0.0;
    for (let i = endIndex - period + 1; i <= endIndex; ++i) {
      varianceSum += Math.pow(data[i].close - mean, 2);
    }
    let stdDev = Math.sqrt(varianceSum / period);
    return {
      middle: mean,
      upper: mean + multiplier * stdDev,
      lower: mean - multiplier * stdDev,
      stdDev
    };
  },

  macd(data, endIndex, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (endIndex < slowPeriod + signalPeriod - 1) return null;
    let fastEma = this.ema(data, endIndex, fastPeriod);
    let slowEma = this.ema(data, endIndex, slowPeriod);
    if (fastEma === null || slowEma === null) return null;
    let macdLine = fastEma - slowEma;

    // Approximate signal line
    let prevFast = this.ema(data, endIndex - 1, fastPeriod);
    let prevSlow = this.ema(data, endIndex - 1, slowPeriod);
    let prevMacd = (prevFast !== null && prevSlow !== null) ? prevFast - prevSlow : macdLine;
    let k = 2 / (signalPeriod + 1);
    let signalLine = macdLine * k + prevMacd * (1 - k);
    let histogram = macdLine - signalLine;
    return { macd: macdLine, signal: signalLine, histogram };
  }
};

class Portfolio {
  constructor(initialCapital = 100000.0, commissionRate = 0.001) {
    this.initialCapital = initialCapital;
    this.cash = initialCapital;
    this.commissionRate = commissionRate;
    this.symbol = "";
    this.positionQuantity = 0;
    this.averagePrice = 0.0;
    this.totalCommissionPaid = 0.0;
  }

  reset() {
    this.cash = this.initialCapital;
    this.symbol = "";
    this.positionQuantity = 0;
    this.averagePrice = 0.0;
    this.totalCommissionPaid = 0.0;
  }

  getPositionQuantity(symbol) {
    return symbol === this.symbol ? this.positionQuantity : 0;
  }

  getPositionAveragePrice(symbol) {
    return symbol === this.symbol ? this.averagePrice : 0.0;
  }

  getTotalValue(symbol, currentPrice) {
    let positionValue = 0.0;
    if (symbol === this.symbol && this.positionQuantity > 0) {
      positionValue = this.positionQuantity * currentPrice;
    }
    return this.cash + positionValue;
  }

  executeTrade(symbol, side, quantity, price) {
    if (quantity <= 0 || price <= 0.0) return 0.0;
    if (!this.symbol) {
      this.symbol = symbol;
    } else if (this.symbol !== symbol) {
      return 0.0;
    }

    let tradeValue = quantity * price;
    let commission = tradeValue * this.commissionRate;
    this.totalCommissionPaid += commission;
    let realizedPnl = 0.0;

    if (side === "BUY") {
      let totalCost = tradeValue + commission;
      if (totalCost > this.cash) return 0.0; // Insufficient cash

      let currentTotalVal = this.positionQuantity * this.averagePrice;
      this.positionQuantity += quantity;
      this.averagePrice = (currentTotalVal + tradeValue) / this.positionQuantity;
      this.cash -= totalCost;
    } else if (side === "SELL") {
      if (quantity > this.positionQuantity) {
        quantity = this.positionQuantity;
        tradeValue = quantity * price;
        commission = tradeValue * this.commissionRate;
      }

      realizedPnl = (price - this.averagePrice) * quantity - commission;
      this.positionQuantity -= quantity;
      this.cash += (tradeValue - commission);

      if (this.positionQuantity === 0) {
        this.averagePrice = 0.0;
      }
    }

    return realizedPnl;
  }
}

class StrategyEngine {
  constructor(type = "sma", params = {}) {
    this.type = type;
    this.params = params;
    this.hasPosition = false;
    this.initDefaults();
  }

  initDefaults() {
    if (this.type === "sma") {
      this.params = {
        shortPeriod: this.params.shortPeriod || 10,
        longPeriod: this.params.longPeriod || 30
      };
    } else if (this.type === "rsi") {
      this.params = {
        period: this.params.period || 14,
        oversold: this.params.oversold || 30,
        overbought: this.params.overbought || 70
      };
    } else if (this.type === "bollinger") {
      this.params = {
        period: this.params.period || 20,
        multiplier: this.params.multiplier || 2.0
      };
    } else if (this.type === "macd") {
      this.params = {
        fast: this.params.fast || 12,
        slow: this.params.slow || 26,
        signal: this.params.signal || 9
      };
    }
  }

  reset() {
    this.hasPosition = false;
  }

  getName() {
    if (this.type === "sma") {
      return `SMA Crossover (${this.params.shortPeriod}/${this.params.longPeriod})`;
    } else if (this.type === "rsi") {
      return `RSI Mean Reversion (${this.params.period}, ${this.params.oversold}/${this.params.overbought})`;
    } else if (this.type === "bollinger") {
      return `Bollinger Breakout (${this.params.period}, ${this.params.multiplier}σ)`;
    } else if (this.type === "macd") {
      return `MACD Momentum (${this.params.fast}/${this.params.slow}/${this.params.signal})`;
    }
    return "Custom Strategy";
  }

  evaluate(index, data) {
    if (this.type === "sma") {
      let { shortPeriod, longPeriod } = this.params;
      if (index < longPeriod) return "HOLD";

      let shortMa = Indicators.sma(data, index, shortPeriod);
      let longMa = Indicators.sma(data, index, longPeriod);
      let prevShortMa = Indicators.sma(data, index - 1, shortPeriod);
      let prevLongMa = Indicators.sma(data, index - 1, longPeriod);

      let crossoverUp = prevShortMa <= prevLongMa && shortMa > longMa;
      let crossoverDown = prevShortMa >= prevLongMa && shortMa < longMa;

      if (crossoverUp && !this.hasPosition) {
        this.hasPosition = true;
        return "BUY";
      } else if (crossoverDown && this.hasPosition) {
        this.hasPosition = false;
        return "SELL";
      }
      return "HOLD";
    }

    if (this.type === "rsi") {
      let { period, oversold, overbought } = this.params;
      if (index < period) return "HOLD";

      let currentRsi = Indicators.rsi(data, index, period);
      if (currentRsi < oversold && !this.hasPosition) {
        this.hasPosition = true;
        return "BUY";
      } else if (currentRsi > overbought && this.hasPosition) {
        this.hasPosition = false;
        return "SELL";
      }
      return "HOLD";
    }

    if (this.type === "bollinger") {
      let { period, multiplier } = this.params;
      if (index < period) return "HOLD";
      let bb = Indicators.bollingerBands(data, index, period, multiplier);
      let prevClose = data[index - 1].close;
      let currClose = data[index].close;

      // Buy when bouncing off lower band
      if (prevClose <= bb.lower && currClose > bb.lower && !this.hasPosition) {
        this.hasPosition = true;
        return "BUY";
      } else if (currClose >= bb.upper && this.hasPosition) {
        this.hasPosition = false;
        return "SELL";
      }
      return "HOLD";
    }

    if (this.type === "macd") {
      let { fast, slow, signal } = this.params;
      if (index < slow + signal) return "HOLD";
      let mCurr = Indicators.macd(data, index, fast, slow, signal);
      let mPrev = Indicators.macd(data, index - 1, fast, slow, signal);
      if (!mCurr || !mPrev) return "HOLD";

      let bullCross = mPrev.macd <= mPrev.signal && mCurr.macd > mCurr.signal;
      let bearCross = mPrev.macd >= mPrev.signal && mCurr.macd < mCurr.signal;

      if (bullCross && !this.hasPosition) {
        this.hasPosition = true;
        return "BUY";
      } else if (bearCross && this.hasPosition) {
        this.hasPosition = false;
        return "SELL";
      }
      return "HOLD";
    }

    return "HOLD";
  }
}

class RiskMetricsCalculator {
  static calculate(initialCapital, equityCurve, trades, benchmarkReturnPct) {
    const metrics = {
      totalReturnPct: 0.0,
      annualizedReturnPct: 0.0,
      buyAndHoldReturnPct: benchmarkReturnPct,
      maxDrawdownPct: 0.0,
      maxDrawdownDurationBars: 0,
      sharpeRatio: 0.0,
      sortinoRatio: 0.0,
      winRate: 0.0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      averageWin: 0.0,
      averageLoss: 0.0,
      profitFactor: 0.0,
      grossProfit: 0.0,
      grossLoss: 0.0,
      expectancy: 0.0
    };

    if (!equityCurve || equityCurve.length === 0 || initialCapital <= 0) {
      return metrics;
    }

    let finalValue = equityCurve[equityCurve.length - 1];
    metrics.totalReturnPct = ((finalValue - initialCapital) / initialCapital) * 100.0;

    let years = equityCurve.length / 252.0;
    if (years > 0.0) {
      metrics.annualizedReturnPct = (Math.pow(finalValue / initialCapital, 1.0 / years) - 1.0) * 100.0;
    } else {
      metrics.annualizedReturnPct = metrics.totalReturnPct;
    }

    // Max Drawdown & Duration
    let peak = initialCapital;
    let maxDd = 0.0;
    let currentDdDuration = 0;
    let maxDdDuration = 0;

    for (let val of equityCurve) {
      if (val >= peak) {
        peak = val;
        currentDdDuration = 0;
      } else {
        currentDdDuration++;
        if (currentDdDuration > maxDdDuration) {
          maxDdDuration = currentDdDuration;
        }
      }
      let dd = (peak - val) / peak;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }
    metrics.maxDrawdownPct = maxDd * 100.0;
    metrics.maxDrawdownDurationBars = maxDdDuration;

    // Sharpe Ratio & Sortino Ratio
    let dailyReturns = [];
    let prevVal = initialCapital;
    for (let val of equityCurve) {
      dailyReturns.push((val - prevVal) / prevVal);
      prevVal = val;
    }

    if (dailyReturns.length > 1) {
      let meanReturn = dailyReturns.reduce((acc, r) => acc + r, 0.0) / dailyReturns.length;
      let variance = 0.0;
      let downsideVariance = 0.0;

      for (let r of dailyReturns) {
        variance += Math.pow(r - meanReturn, 2);
        if (r < 0) {
          downsideVariance += Math.pow(r, 2);
        }
      }

      let stdDev = Math.sqrt(variance / (dailyReturns.length - 1));
      let downsideStdDev = Math.sqrt(downsideVariance / (dailyReturns.length - 1));

      if (stdDev > 0.0) {
        metrics.sharpeRatio = (meanReturn / stdDev) * Math.sqrt(252);
      }
      if (downsideStdDev > 0.0) {
        metrics.sortinoRatio = (meanReturn / downsideStdDev) * Math.sqrt(252);
      }
    }

    // Trade statistics
    let grossProfit = 0.0;
    let grossLoss = 0.0;

    for (let trade of trades) {
      if (trade.side === "SELL") {
        metrics.totalTrades++;
        if (trade.realizedPnl > 0) {
          metrics.winningTrades++;
          grossProfit += trade.realizedPnl;
        } else {
          metrics.losingTrades++;
          grossLoss += Math.abs(trade.realizedPnl);
        }
      }
    }

    metrics.grossProfit = grossProfit;
    metrics.grossLoss = grossLoss;

    if (metrics.totalTrades > 0) {
      metrics.winRate = (metrics.winningTrades / metrics.totalTrades) * 100.0;
    }
    if (metrics.winningTrades > 0) {
      metrics.averageWin = grossProfit / metrics.winningTrades;
    }
    if (metrics.losingTrades > 0) {
      metrics.averageLoss = grossLoss / metrics.losingTrades;
    }

    if (grossLoss > 0.0) {
      metrics.profitFactor = grossProfit / grossLoss;
    } else if (grossProfit > 0.0) {
      metrics.profitFactor = 999.0;
    }

    if (metrics.totalTrades > 0) {
      let winProb = metrics.winningTrades / metrics.totalTrades;
      let lossProb = metrics.losingTrades / metrics.totalTrades;
      metrics.expectancy = (winProb * metrics.averageWin) - (lossProb * metrics.averageLoss);
    }

    return metrics;
  }
}

class Backtester {
  constructor(config = {}) {
    this.config = {
      initialCapital: config.initialCapital || 100000.0,
      commissionRate: config.commissionRate !== undefined ? config.commissionRate : 0.001,
      positionSize: config.positionSize || 100,
      positionType: config.positionType || "fixed", // "fixed" shares or "percent" of capital
      symbol: config.symbol || "AAPL"
    };
  }

  run(data, strategy) {
    if (!data || data.length === 0) {
      return null;
    }

    const portfolio = new Portfolio(this.config.initialCapital, this.config.commissionRate);
    strategy.reset();

    const trades = [];
    const equityCurve = [];
    const signals = []; // Array of signals per bar
    const indicatorValues = []; // Per bar indicators for charting

    for (let i = 0; i < data.length; ++i) {
      let bar = data[i];
      let signal = strategy.evaluate(i, data);
      signals.push(signal);

      // Track indicator values for visualization
      let ind = {};
      if (strategy.type === "sma") {
        ind.smaFast = Indicators.sma(data, i, strategy.params.shortPeriod);
        ind.smaSlow = Indicators.sma(data, i, strategy.params.longPeriod);
      } else if (strategy.type === "rsi") {
        ind.rsi = Indicators.rsi(data, i, strategy.params.period);
      } else if (strategy.type === "bollinger") {
        let bb = Indicators.bollingerBands(data, i, strategy.params.period, strategy.params.multiplier);
        if (bb) {
          ind.bbUpper = bb.upper;
          ind.bbMiddle = bb.middle;
          ind.bbLower = bb.lower;
        }
      } else if (strategy.type === "macd") {
        let m = Indicators.macd(data, i, strategy.params.fast, strategy.params.slow, strategy.params.signal);
        if (m) {
          ind.macd = m.macd;
          ind.signal = m.signal;
          ind.histogram = m.histogram;
        }
      }
      indicatorValues.push(ind);

      // Trade Execution
      if (signal === "BUY" && portfolio.getPositionQuantity(this.config.symbol) === 0) {
        let costPerShare = bar.close * (1.0 + this.config.commissionRate);
        let maxAffordable = Math.floor(portfolio.cash / costPerShare);
        
        let desiredQty = this.config.positionSize;
        if (this.config.positionType === "percent") {
          let targetCapital = portfolio.cash * (this.config.positionSize / 100);
          desiredQty = Math.floor(targetCapital / costPerShare);
        }
        let qty = Math.min(desiredQty, maxAffordable);

        if (qty > 0) {
          portfolio.executeTrade(this.config.symbol, "BUY", qty, bar.close);
          trades.push({
            barIndex: i,
            date: bar.date,
            symbol: this.config.symbol,
            side: "BUY",
            quantity: qty,
            price: bar.close,
            commission: qty * bar.close * this.config.commissionRate,
            realizedPnl: 0.0,
            portfolioValue: portfolio.getTotalValue(this.config.symbol, bar.close)
          });
        }
      } else if (signal === "SELL" && portfolio.getPositionQuantity(this.config.symbol) > 0) {
        let qty = portfolio.getPositionQuantity(this.config.symbol);
        let realizedPnl = portfolio.executeTrade(this.config.symbol, "SELL", qty, bar.close);

        trades.push({
          barIndex: i,
          date: bar.date,
          symbol: this.config.symbol,
          side: "SELL",
          quantity: qty,
          price: bar.close,
          commission: qty * bar.close * this.config.commissionRate,
          realizedPnl: realizedPnl,
          portfolioValue: portfolio.getTotalValue(this.config.symbol, bar.close)
        });
      }

      let currentValue = portfolio.getTotalValue(this.config.symbol, bar.close);
      equityCurve.push(currentValue);
    }

    // Force close open position at end of backtest
    if (portfolio.getPositionQuantity(this.config.symbol) > 0) {
      let qty = portfolio.getPositionQuantity(this.config.symbol);
      let finalPrice = data[data.length - 1].close;
      let realizedPnl = portfolio.executeTrade(this.config.symbol, "SELL", qty, finalPrice);

      trades.push({
        barIndex: data.length - 1,
        date: data[data.length - 1].date,
        symbol: this.config.symbol,
        side: "SELL",
        quantity: qty,
        price: finalPrice,
        commission: qty * finalPrice * this.config.commissionRate,
        realizedPnl: realizedPnl,
        portfolioValue: portfolio.cash,
        isClosingFill: true
      });

      equityCurve[equityCurve.length - 1] = portfolio.cash;
    }

    let finalValue = equityCurve[equityCurve.length - 1];
    let firstPrice = data[0].close;
    let lastPrice = data[data.length - 1].close;
    let benchmarkReturnPct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100.0 : 0.0;

    // Benchmark equity curve
    let benchmarkShares = this.config.initialCapital / firstPrice;
    let benchmarkEquity = data.map(b => b.close * benchmarkShares);

    const metrics = RiskMetricsCalculator.calculate(
      this.config.initialCapital,
      equityCurve,
      trades,
      benchmarkReturnPct
    );

    return {
      config: { ...this.config },
      strategyName: strategy.getName(),
      initialCapital: this.config.initialCapital,
      finalValue: finalValue,
      equityCurve: equityCurve,
      benchmarkEquity: benchmarkEquity,
      trades: trades,
      signals: signals,
      indicators: indicatorValues,
      metrics: metrics,
      bars: data
    };
  }
}

if (typeof window !== "undefined") {
  window.Indicators = Indicators;
  window.Portfolio = Portfolio;
  window.StrategyEngine = StrategyEngine;
  window.RiskMetricsCalculator = RiskMetricsCalculator;
  window.Backtester = Backtester;
}
