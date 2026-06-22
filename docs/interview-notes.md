# Interview Notes: Algorithmic Trading Engine

*Use these notes to articulate the design decisions, trade-offs, and architecture of the project during software engineering interviews.*

## 1. System Architecture & Data Flow

**Data Flow:**
`CSV File` -> `MarketDataLoader` -> `std::vector<PriceBar>` -> `Backtester` <-> `Strategy` & `Portfolio` -> `RiskMetrics`

**Architecture:**
- **Decoupled Components:** The `Strategy` doesn't know about cash or commissions; it only sees prices and returns a `Signal`. The `Portfolio` doesn't know about moving averages; it only knows how to process a `BUY` or `SELL` and keep an accounting ledger.
- **Why C++?** Perfect for high-performance financial systems where memory control and deterministic execution are critical. I used C++17 for features like smart pointers and modern standard library containers.

## 2. Why Single-Threaded Backtesting?

A common mistake in backtesters is mimicking a live trading system by using background threads, mutexes, and real-time event loops. 
- **The Problem with Threads in Backtesting:** They introduce non-determinism. If two threads read/write state simultaneously without proper locking, results change between runs. If you use heavy locking (mutexes), you destroy performance.
- **The Solution:** Historical backtesting is inherently a sequential problem (you cannot know day `T+1` before day `T`). A single-threaded loop walking through an array of structs is highly cache-efficient and guarantees 100% deterministic, reproducible results.

## 3. Financial Mechanics Modeling

- **Commissions:** Explicitly modeled as a percentage of the total trade value (e.g., 0.1%). This is deducted from cash on every trade, making the simulation realistic (naive backtesters often ignore slippage and commissions, leading to wildly overstated returns).
- **PnL Tracking:** We calculate *Realized PnL* when closing a position and *Unrealized PnL* by marking the portfolio to market using the current day's closing price.
- **Avoiding Lookahead Bias:** The `Strategy::evaluate(index, data)` method only computes indicators using data up to `index`. It cannot peek at `data[index + 1]`.

## 4. Risk Metrics Calculation

- **Sharpe Ratio:** Calculated using the sample standard deviation of daily returns, annualized by multiplying by `sqrt(252)` (assuming 252 trading days in a year). It assumes a risk-free rate of 0% for simplicity.
- **Maximum Drawdown:** Continuously tracks the highest `peak` the portfolio has ever reached. On every bar, calculates the percentage drop from that peak. The `max_drawdown` is the largest of these drops.
- **Buy & Hold Benchmark:** Compares the strategy's return against simply buying the asset on day 1 and holding it until the end of the simulation.

## 5. Trade-Offs & Limitations

If an interviewer asks "What are the flaws/limitations of your system?":
1. **No Order Book / Slippage:** The backtester assumes 100% fill rate at exactly the closing price. In reality, a large market order would experience slippage and move the price.
2. **Single Instrument:** The `Portfolio` class currently assumes we are only trading one symbol at a time. To support cross-asset strategies (like statistical arbitrage), it would need to manage a map of positions and track portfolio-level covariance.
3. **No Event Queue:** For a true live-trading system, the architecture would need to transition to an Event-Driven Architecture with distinct `DataEvent`, `SignalEvent`, and `OrderEvent` queues.
