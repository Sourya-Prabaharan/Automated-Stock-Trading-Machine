# Design decisions

## Data flow

`CSV -> MarketDataLoader -> Backtester -> Strategy / Portfolio -> RiskMetrics`

The strategy computes signals from historical prices. Portfolio accounting handles cash, positions, and commissions. Risk metrics summarize the resulting equity curve and completed trades.

## Sequential execution

The native backtester walks one price series sequentially. This keeps order and portfolio state easy to inspect. No claim is made that all backtesting must be single-threaded or that this implementation reaches a specific throughput.

## Modeling assumptions

- Built-in native strategies are SMA crossover and RSI.
- Commission is charged as a fraction of trade value; there is no broker execution or order-book simulation.
- Signals use data through the current bar, and simulated execution uses that bar's close. This simplifying assumption is not a demonstration of executable live-market returns.
- Custom strategies receive the full vector, so avoiding future data is a responsibility of each strategy, not an API-enforced guarantee.
- Annualized metrics assume daily bars and 252 trading days. Drawdown is reported after simulation; it does not itself stop trading.

See [architecture](architecture.md), [source](../src), and [assertion-based tests](../tests) for implementation details.
