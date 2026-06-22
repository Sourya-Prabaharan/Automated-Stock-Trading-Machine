# Algorithmic Trading & Backtesting Engine

**Overview**
A high-performance, deterministic backtesting engine for quantitative trading strategies, written from scratch in modern C++17. Designed to simulate historical stock market trading, track portfolio equity, and calculate institutional risk metrics.

**Technical Highlights**
- **Language/Stack:** C++17, standard library containers (`std::vector`, `std::unique_ptr`), CMake.
- **Architecture:** Decoupled, modular design separating data ingestion (`MarketDataLoader`), strategy logic (`Strategy`), state management (`Portfolio`), and analytics (`RiskMetrics`).
- **Performance:** Single-threaded execution loop that leverages CPU cache locality to process thousands of historical price bars deterministically and without the overhead of mutex locks.
- **Financial Math:** Built-in implementations for technical indicators (SMA, RSI) and institutional metrics (Sharpe Ratio, Max Drawdown, Profit Factor).

**Challenges Solved**
- **Lookahead Bias & Determinism:** Transitioned the system from a multi-threaded, non-deterministic event loop to a sequential processor, ensuring that trading results are 100% reproducible and strictly evaluate only historical data.
- **Realistic Accounting:** Developed a rigorous `Portfolio` state machine that accurately tracks cash, updates average entry prices, and deducts proportional trading commissions on every transaction.

**Key Results**
- Successfully parses historical CSV market data, evaluates mathematical strategies, and outputs a complete trade history and equity curve.
- Developed zero-dependency unit tests for the core logic, ensuring robust mathematical accuracy across the simulation.
- Provides a scalable template where new trading algorithms can be added by implementing a single abstract base class.
