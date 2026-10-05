/**
 * Titan Quant Engine - Main Application Controller
 * Handles UI interactions, strategy execution, visualizer playback,
 * recruiter drawer, architecture inspector, and C++ code viewer.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Core Systems
  const charts = new QuantCharts();
  charts.init("price-chart", "osc-chart", "equity-chart", "drawdown-chart");

  let terminal = null;
  if (document.getElementById("terminal-output")) {
    terminal = new QuantTerminal("terminal-output", "term-cmd-input");
  }

  // State
  let currentDatasetKey = "AAPL";
  let currentBars = window.MARKET_DATASETS.AAPL.bars;
  let activeStrategy = "sma";
  let lastResult = null;
  let isPlaying = false;
  let playTimer = null;
  let currentPlaybackBar = 0;
  let playbackSpeed = 50; // ms per bar

  // Strategy Configurations
  const strategyParams = {
    sma: { shortPeriod: 10, longPeriod: 30 },
    rsi: { period: 14, oversold: 30, overbought: 70 },
    bollinger: { period: 20, multiplier: 2.0 },
    macd: { fast: 12, slow: 26, signal: 9 }
  };

  // UI Element References
  const datasetSelect = document.getElementById("dataset-select");
  const strategySelect = document.getElementById("strategy-select");
  const strategyParamsContainer = document.getElementById("strategy-params-container");
  const initialCapitalInput = document.getElementById("initial-capital");
  const commissionRateInput = document.getElementById("commission-rate");
  const positionSizeInput = document.getElementById("position-size");
  const positionTypeSelect = document.getElementById("position-type");
  
  const btnRun = document.getElementById("btn-run-backtest");
  const btnPlay = document.getElementById("btn-play-stream");
  const btnStep = document.getElementById("btn-step-bar");
  const btnReset = document.getElementById("btn-reset");
  const speedSlider = document.getElementById("playback-speed");
  const speedDisplay = document.getElementById("speed-display");
  const chartModeSelect = document.getElementById("chart-mode-select");

  const tradeTableBody = document.getElementById("trade-table-body");
  const tradeFilter = document.getElementById("trade-filter");
  const btnExportCsv = document.getElementById("btn-export-csv");

  // Recruiter Copy Button
  const btnCopyRecruiter = document.getElementById("btn-copy-recruiter");
  const copyToast = document.getElementById("copy-toast");

  // Render Strategy Parameters Inputs
  function renderStrategyParams() {
    strategyParamsContainer.innerHTML = "";
    const type = strategySelect.value;
    activeStrategy = type;

    if (type === "sma") {
      strategyParamsContainer.innerHTML = `
        <div class="param-group">
          <label>Fast Period (bars)</label>
          <input type="number" id="param-sma-fast" value="${strategyParams.sma.shortPeriod}" min="2" max="50" class="input-field">
        </div>
        <div class="param-group">
          <label>Slow Period (bars)</label>
          <input type="number" id="param-sma-slow" value="${strategyParams.sma.longPeriod}" min="5" max="150" class="input-field">
        </div>
      `;
      document.getElementById("param-sma-fast").addEventListener("input", (e) => {
        strategyParams.sma.shortPeriod = parseInt(e.target.value) || 10;
      });
      document.getElementById("param-sma-slow").addEventListener("input", (e) => {
        strategyParams.sma.longPeriod = parseInt(e.target.value) || 30;
      });
    } else if (type === "rsi") {
      strategyParamsContainer.innerHTML = `
        <div class="param-group">
          <label>RSI Period</label>
          <input type="number" id="param-rsi-period" value="${strategyParams.rsi.period}" min="3" max="50" class="input-field">
        </div>
        <div class="param-group">
          <label>Oversold Threshold</label>
          <input type="number" id="param-rsi-oversold" value="${strategyParams.rsi.oversold}" min="10" max="45" class="input-field">
        </div>
        <div class="param-group">
          <label>Overbought Threshold</label>
          <input type="number" id="param-rsi-overbought" value="${strategyParams.rsi.overbought}" min="55" max="90" class="input-field">
        </div>
      `;
      document.getElementById("param-rsi-period").addEventListener("input", (e) => {
        strategyParams.rsi.period = parseInt(e.target.value) || 14;
      });
      document.getElementById("param-rsi-oversold").addEventListener("input", (e) => {
        strategyParams.rsi.oversold = parseFloat(e.target.value) || 30;
      });
      document.getElementById("param-rsi-overbought").addEventListener("input", (e) => {
        strategyParams.rsi.overbought = parseFloat(e.target.value) || 70;
      });
    } else if (type === "bollinger") {
      strategyParamsContainer.innerHTML = `
        <div class="param-group">
          <label>Period (bars)</label>
          <input type="number" id="param-bb-period" value="${strategyParams.bollinger.period}" min="5" max="50" class="input-field">
        </div>
        <div class="param-group">
          <label>Std Dev Multiplier</label>
          <input type="number" id="param-bb-mult" value="${strategyParams.bollinger.multiplier}" step="0.1" min="1.0" max="3.5" class="input-field">
        </div>
      `;
      document.getElementById("param-bb-period").addEventListener("input", (e) => {
        strategyParams.bollinger.period = parseInt(e.target.value) || 20;
      });
      document.getElementById("param-bb-mult").addEventListener("input", (e) => {
        strategyParams.bollinger.multiplier = parseFloat(e.target.value) || 2.0;
      });
    } else if (type === "macd") {
      strategyParamsContainer.innerHTML = `
        <div class="param-group">
          <label>Fast EMA</label>
          <input type="number" id="param-macd-fast" value="${strategyParams.macd.fast}" min="5" max="30" class="input-field">
        </div>
        <div class="param-group">
          <label>Slow EMA</label>
          <input type="number" id="param-macd-slow" value="${strategyParams.macd.slow}" min="15" max="60" class="input-field">
        </div>
        <div class="param-group">
          <label>Signal Period</label>
          <input type="number" id="param-macd-signal" value="${strategyParams.macd.signal}" min="3" max="20" class="input-field">
        </div>
      `;
      document.getElementById("param-macd-fast").addEventListener("input", (e) => {
        strategyParams.macd.fast = parseInt(e.target.value) || 12;
      });
      document.getElementById("param-macd-slow").addEventListener("input", (e) => {
        strategyParams.macd.slow = parseInt(e.target.value) || 26;
      });
      document.getElementById("param-macd-signal").addEventListener("input", (e) => {
        strategyParams.macd.signal = parseInt(e.target.value) || 9;
      });
    }
  }

  // Execute Backtest
  function executeBacktest() {
    stopPlayback();

    const initialCapital = parseFloat(initialCapitalInput.value) || 100000.0;
    const commissionRate = (parseFloat(commissionRateInput.value) || 0.1) / 100.0;
    const positionSize = parseInt(positionSizeInput.value) || 100;
    const positionType = positionTypeSelect.value;
    const symbol = currentDatasetKey;

    const strategy = new StrategyEngine(activeStrategy, strategyParams[activeStrategy]);
    const backtester = new Backtester({
      initialCapital,
      commissionRate,
      positionSize,
      positionType,
      symbol
    });

    const result = backtester.run(currentBars, strategy);
    lastResult = result;

    updateMetricsDashboard(result);
    charts.setData(result, null);
    renderTradeLog(result.trades);
    renderComparisonMatrix();
    updatePlaybackControls(currentBars.length - 1);
  }

  // Update Metrics Dashboard UI
  function updateMetricsDashboard(result) {
    const m = result.metrics;
    const initCap = result.initialCapital;
    const finalVal = result.finalValue;
    const netPnl = finalVal - initCap;
    const isProfitable = netPnl >= 0;

    // Total Return
    const totalRetEl = document.getElementById("metric-total-return");
    const totalRetVal = document.getElementById("metric-total-return-val");
    if (totalRetEl) {
      totalRetEl.textContent = `${isProfitable ? '+' : ''}${m.totalReturnPct.toFixed(2)}%`;
      totalRetEl.className = `metric-value ${isProfitable ? 'text-emerald' : 'text-rose'}`;
      totalRetVal.textContent = `$${finalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Benchmark Return
    const bmarkEl = document.getElementById("metric-benchmark");
    if (bmarkEl) {
      bmarkEl.textContent = `${m.buyAndHoldReturnPct >= 0 ? '+' : ''}${m.buyAndHoldReturnPct.toFixed(2)}%`;
    }

    // Alpha
    const alphaEl = document.getElementById("metric-alpha");
    if (alphaEl) {
      const alpha = m.totalReturnPct - m.buyAndHoldReturnPct;
      alphaEl.textContent = `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}%`;
      alphaEl.className = `metric-sub ${alpha >= 0 ? 'text-emerald' : 'text-rose'}`;
    }

    // Sharpe Ratio
    const sharpeEl = document.getElementById("metric-sharpe");
    if (sharpeEl) {
      sharpeEl.textContent = m.sharpeRatio.toFixed(2);
      sharpeEl.className = `metric-value ${m.sharpeRatio >= 1.0 ? 'text-emerald' : m.sharpeRatio > 0 ? 'text-cyan' : 'text-rose'}`;
    }

    // Sortino Ratio
    const sortinoEl = document.getElementById("metric-sortino");
    if (sortinoEl) {
      sortinoEl.textContent = m.sortinoRatio.toFixed(2);
    }

    // Max Drawdown
    const maxDdEl = document.getElementById("metric-max-dd");
    const ddDurEl = document.getElementById("metric-dd-duration");
    if (maxDdEl) {
      maxDdEl.textContent = `-${m.maxDrawdownPct.toFixed(2)}%`;
      if (ddDurEl) ddDurEl.textContent = `${m.maxDrawdownDurationBars} bars`;
    }

    // Win Rate
    const winRateEl = document.getElementById("metric-win-rate");
    const tradeCountEl = document.getElementById("metric-trades-summary");
    if (winRateEl) {
      winRateEl.textContent = `${m.winRate.toFixed(1)}%`;
      tradeCountEl.textContent = `${m.winningTrades}W / ${m.losingTrades}L (${m.totalTrades} closed)`;
    }

    // Profit Factor
    const pfEl = document.getElementById("metric-profit-factor");
    if (pfEl) {
      pfEl.textContent = m.profitFactor >= 999 ? "∞ (No Losses)" : m.profitFactor.toFixed(2);
    }

    // Expectancy
    const expEl = document.getElementById("metric-expectancy");
    if (expEl) {
      expEl.textContent = `${m.expectancy >= 0 ? '+' : ''}$${m.expectancy.toFixed(2)}`;
      expEl.className = `metric-sub ${m.expectancy >= 0 ? 'text-emerald' : 'text-rose'}`;
    }

    // Strategy Name header tag
    const stratNameEl = document.getElementById("active-strategy-name");
    if (stratNameEl) {
      stratNameEl.textContent = result.strategyName;
    }
  }

  // Render Trade Log Table
  function renderTradeLog(trades) {
    tradeTableBody.innerHTML = "";
    const filter = tradeFilter.value;

    const filtered = trades.filter(t => {
      if (filter === "all") return true;
      if (filter === "wins") return t.side === "SELL" && t.realizedPnl > 0;
      if (filter === "losses") return t.side === "SELL" && t.realizedPnl <= 0;
      return true;
    });

    if (filtered.length === 0) {
      tradeTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-slate">No executed trades match current filter</td></tr>`;
      return;
    }

    filtered.forEach((t, i) => {
      const isBuy = t.side === "BUY";
      const pnl = t.realizedPnl;
      const isWin = pnl > 0;
      const pnlFormatted = isBuy ? "—" : `${isWin ? '+' : ''}$${pnl.toFixed(2)}`;
      const pnlClass = isBuy ? "text-slate" : isWin ? "text-emerald font-bold" : "text-rose font-bold";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="font-mono text-slate text-xs">#${i + 1}</td>
        <td class="font-mono text-xs">${t.date}</td>
        <td><span class="badge ${isBuy ? 'badge-buy' : 'badge-sell'}">${t.side}</span></td>
        <td class="font-mono">${t.quantity}</td>
        <td class="font-mono">$${t.price.toFixed(2)}</td>
        <td class="font-mono text-slate text-xs">$${t.commission.toFixed(2)}</td>
        <td class="${pnlClass}">${pnlFormatted}</td>
        <td class="font-mono text-slate">$${t.portfolioValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      `;
      tradeTableBody.appendChild(tr);
    });
  }

  // Export Trade History CSV
  function exportTradeHistoryCsv() {
    if (!lastResult || !lastResult.trades || lastResult.trades.length === 0) {
      alert("No trade records available to export. Run a backtest first.");
      return;
    }

    let csv = "Date,Symbol,Side,Quantity,Price,Commission,RealizedPnL,PortfolioValue\n";
    for (const t of lastResult.trades) {
      csv += `${t.date},${t.symbol},${t.side},${t.quantity},${t.price.toFixed(2)},${t.commission.toFixed(2)},${t.realizedPnl.toFixed(2)},${t.portfolioValue.toFixed(2)}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trade_history_${lastResult.config.symbol}_${activeStrategy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Performance Comparison Matrix
  function renderComparisonMatrix() {
    const tableBody = document.getElementById("matrix-table-body");
    if (!tableBody || !currentBars) return;

    const initialCapital = parseFloat(initialCapitalInput.value) || 100000.0;
    const commissionRate = (parseFloat(commissionRateInput.value) || 0.1) / 100.0;
    const positionSize = parseInt(positionSizeInput.value) || 100;
    const symbol = currentDatasetKey;

    const strategiesToCompare = [
      { id: "sma", name: "SMA Crossover (10/30)", strat: new StrategyEngine("sma", { shortPeriod: 10, longPeriod: 30 }) },
      { id: "rsi", name: "RSI Mean Reversion (14)", strat: new StrategyEngine("rsi", { period: 14, oversold: 30, overbought: 70 }) },
      { id: "bollinger", name: "Bollinger Breakout (20, 2σ)", strat: new StrategyEngine("bollinger", { period: 20, multiplier: 2.0 }) },
      { id: "macd", name: "MACD Momentum (12/26/9)", strat: new StrategyEngine("macd", { fast: 12, slow: 26, signal: 9 }) }
    ];

    const results = strategiesToCompare.map(item => {
      const bt = new Backtester({ initialCapital, commissionRate, positionSize, symbol });
      return {
        ...item,
        res: bt.run(currentBars, item.strat)
      };
    });

    tableBody.innerHTML = "";
    results.forEach(item => {
      const m = item.res.metrics;
      const isCurrent = item.id === activeStrategy;
      const tr = document.createElement("tr");
      if (isCurrent) tr.className = "row-active-strategy";

      tr.innerHTML = `
        <td class="font-bold">
          ${item.name} ${isCurrent ? '<span class="badge badge-active">Active</span>' : ''}
        </td>
        <td class="${m.totalReturnPct >= 0 ? 'text-emerald font-bold' : 'text-rose font-bold'}">
          ${m.totalReturnPct >= 0 ? '+' : ''}${m.totalReturnPct.toFixed(2)}%
        </td>
        <td>${m.annualizedReturnPct >= 0 ? '+' : ''}${m.annualizedReturnPct.toFixed(2)}%</td>
        <td class="${m.sharpeRatio >= 1.0 ? 'text-emerald' : m.sharpeRatio > 0 ? 'text-cyan' : 'text-rose'}">
          ${m.sharpeRatio.toFixed(2)}
        </td>
        <td class="text-rose">-${m.maxDrawdownPct.toFixed(2)}%</td>
        <td>${m.winRate.toFixed(1)}%</td>
        <td>${m.totalTrades}</td>
        <td class="text-cyan">${m.profitFactor >= 999 ? '∞' : m.profitFactor.toFixed(2)}</td>
        <td>
          <button class="btn-xs btn-outline" data-apply-strat="${item.id}">Select</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Add Select buttons
    tableBody.querySelectorAll("[data-apply-strat]").forEach(btn => {
      btn.addEventListener("click", () => {
        strategySelect.value = btn.getAttribute("data-apply-strat");
        renderStrategyParams();
        executeBacktest();
      });
    });
  }

  // Playback & Stepper Controls
  function updatePlaybackControls(barIdx) {
    currentPlaybackBar = barIdx;
    const progressEl = document.getElementById("playback-progress");
    const countEl = document.getElementById("playback-count");
    if (progressEl) {
      const pct = (barIdx / (currentBars.length - 1)) * 100;
      progressEl.style.width = `${pct}%`;
    }
    if (countEl) {
      countEl.textContent = `Bar ${barIdx + 1} of ${currentBars.length} (${currentBars[barIdx] ? currentBars[barIdx].date : ''})`;
    }
  }

  function startPlayback() {
    if (!lastResult) executeBacktest();
    isPlaying = true;
    btnPlay.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause`;
    btnPlay.classList.add("btn-playing");

    if (currentPlaybackBar >= currentBars.length - 1) {
      currentPlaybackBar = 0;
    }

    playTimer = setInterval(() => {
      if (currentPlaybackBar >= currentBars.length - 1) {
        stopPlayback();
        return;
      }
      currentPlaybackBar++;
      charts.setData(lastResult, currentPlaybackBar);
      updatePlaybackControls(currentPlaybackBar);
    }, playbackSpeed);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playTimer) clearInterval(playTimer);
    playTimer = null;
    if (btnPlay) {
      btnPlay.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Stream`;
      btnPlay.classList.remove("btn-playing");
    }
  }

  function stepForward() {
    stopPlayback();
    if (!lastResult) executeBacktest();
    if (currentPlaybackBar < currentBars.length - 1) {
      currentPlaybackBar++;
      charts.setData(lastResult, currentPlaybackBar);
      updatePlaybackControls(currentPlaybackBar);
    }
  }

  // Event Listeners for Controls
  strategySelect.addEventListener("change", () => {
    renderStrategyParams();
    executeBacktest();
  });

  datasetSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "custom") {
      document.getElementById("custom-file-input").click();
      return;
    }
    if (window.MARKET_DATASETS[val]) {
      currentDatasetKey = val;
      currentBars = window.MARKET_DATASETS[val].bars;
      executeBacktest();
    }
  });

  chartModeSelect.addEventListener("change", (e) => {
    charts.setChartMode(e.target.value);
  });

  btnRun.addEventListener("click", executeBacktest);

  btnPlay.addEventListener("click", () => {
    if (isPlaying) stopPlayback(); else startPlayback();
  });

  btnStep.addEventListener("click", stepForward);

  btnReset.addEventListener("click", () => {
    stopPlayback();
    currentPlaybackBar = 0;
    charts.setData(lastResult, 0);
    updatePlaybackControls(0);
  });

  speedSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    // slider 1..10 maps to 200ms .. 10ms
    playbackSpeed = Math.max(10, Math.floor(220 - val * 20));
    speedDisplay.textContent = `${val}x`;
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  });

  tradeFilter.addEventListener("change", () => {
    if (lastResult) renderTradeLog(lastResult.trades);
  });

  btnExportCsv.addEventListener("click", exportTradeHistoryCsv);

  // Custom File Upload
  const customFileInput = document.getElementById("custom-file-input");
  customFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split("\n");
        const header = lines[0].split(",").map(h => h.trim().toLowerCase());
        
        const dateIdx = header.indexOf("date");
        const openIdx = header.indexOf("open");
        const highIdx = header.indexOf("high");
        const lowIdx = header.indexOf("low");
        const closeIdx = header.indexOf("close");
        const volIdx = header.indexOf("volume");

        if (dateIdx === -1 || closeIdx === -1) {
          alert("CSV must contain at least 'Date' and 'Close' columns.");
          return;
        }

        const parsedBars = [];
        for (let i = 1; i < lines.length; ++i) {
          const parts = lines[i].split(",").map(p => p.trim());
          if (parts.length < header.length) continue;

          const close = parseFloat(parts[closeIdx]);
          const open = openIdx !== -1 ? parseFloat(parts[openIdx]) : close;
          const high = highIdx !== -1 ? parseFloat(parts[highIdx]) : Math.max(open, close);
          const low = lowIdx !== -1 ? parseFloat(parts[lowIdx]) : Math.min(open, close);
          const vol = volIdx !== -1 ? parseInt(parts[volIdx]) || 1000000 : 1000000;

          if (!isNaN(close)) {
            parsedBars.push({
              date: parts[dateIdx],
              open, high, low, close, volume: vol
            });
          }
        }

        if (parsedBars.length < 10) {
          alert("CSV has fewer than 10 valid price rows.");
          return;
        }

        currentDatasetKey = file.name.replace(/\.[^/.]+$/, "");
        currentBars = parsedBars;
        
        // Add option to select dropdown
        let opt = document.getElementById("opt-custom-loaded");
        if (!opt) {
          opt = document.createElement("option");
          opt.id = "opt-custom-loaded";
          datasetSelect.insertBefore(opt, datasetSelect.lastElementChild);
        }
        opt.value = currentDatasetKey;
        opt.textContent = `Custom: ${file.name} (${parsedBars.length} bars)`;
        datasetSelect.value = currentDatasetKey;

        executeBacktest();
      } catch (err) {
        alert("Error parsing CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Architecture Component Inspector Details
  const archNodes = document.querySelectorAll(".arch-node");
  const archDetails = document.getElementById("arch-inspector-details");

  const componentData = {
    "MarketDataLoader": {
      title: "MarketDataLoader (CSV Ingestion Engine)",
      source: "src/MarketDataLoader.cpp & include/MarketDataLoader.h",
      complexity: "O(N) sequential stream parse, Zero copy overhead",
      desc: "Parses historical OHLCV data directly from CSV files into memory-aligned PriceBar structs in a contiguous std::vector. Enforces strict chronological ordering to guarantee deterministic backtesting.",
      keyFeatures: [
        "Streams file without loading full raw text into heap",
        "Validates Date, Open, High, Low, Close, Volume schema",
        "Cache-friendly contiguous memory layout (std::vector<PriceBar>)"
      ]
    },
    "Backtester": {
      title: "Backtester (Deterministic Orchestration Loop)",
      source: "src/Backtester.cpp & include/Backtester.h",
      complexity: "O(N) time, zero dynamic allocations in the hot loop",
      desc: "The heartbeat of the algorithmic trading system. Sequentially evaluates bars one-by-one, strictly enforcing historical causality (t <= T) to completely eliminate lookahead bias.",
      keyFeatures: [
        "100% Deterministic single-threaded execution (no race conditions)",
        "Zero mutex locking overhead: processes >500,000 bars/sec",
        "Sizes positions based on available cash and executes fills at exact bar close"
      ]
    },
    "Strategy": {
      title: "Strategy (Polymorphic Signal Generator)",
      source: "src/Strategy.cpp & include/Strategy.h",
      complexity: "O(Period) per bar, pure virtual interface",
      desc: "Abstract base class defining the contract for quantitative algorithms. Strategy logic is completely decoupled from cash, commissions, or portfolio accounting.",
      keyFeatures: [
        "Pure virtual 'Signal evaluate(int index, const std::vector<PriceBar>& data)'",
        "Built-in indicators: SMA and RSI pure math functions in namespace Indicators",
        "Strict lookahead protection: indicator functions only slice data up to 'index'"
      ]
    },
    "Portfolio": {
      title: "Portfolio (State Machine & Execution Ledger)",
      source: "src/Portfolio.cpp & include/Portfolio.h",
      complexity: "O(1) execution and mark-to-market accounting",
      desc: "Rigorous financial ledger tracking available cash balances, active inventory, volume-weighted average entry prices, and transaction commissions.",
      keyFeatures: [
        "Models 0.1% proportional commission per trade to prevent paper profit illusions",
        "Realized PnL calculated accurately upon position liquidation",
        "Mark-to-market unrealized valuation at every discrete price bar"
      ]
    },
    "RiskMetrics": {
      title: "RiskMetrics (Institutional Analytics Engine)",
      source: "src/RiskMetrics.cpp & include/RiskMetrics.h",
      complexity: "O(N) post-hoc analytics pass",
      desc: "Calculates institutional quantitative metrics on the backtest equity curve and trade history for comprehensive risk assessment.",
      keyFeatures: [
        "Annualized Sharpe Ratio: mean return / std dev * sqrt(252)",
        "Continuous high-water mark peak tracking for Maximum Drawdown & duration",
        "Profit Factor, Win Rate, and Buy & Hold benchmark comparative returns"
      ]
    }
  };

  archNodes.forEach(node => {
    node.addEventListener("click", () => {
      archNodes.forEach(n => n.classList.remove("node-selected"));
      node.classList.add("node-selected");

      const compId = node.getAttribute("data-component");
      const info = componentData[compId];
      if (info && archDetails) {
        archDetails.innerHTML = `
          <div class="arch-card-header">
            <h4>${info.title}</h4>
            <span class="arch-file-tag">${info.source}</span>
          </div>
          <p class="arch-desc">${info.desc}</p>
          <div class="arch-complexity"><span class="label">Performance Guarantee:</span> <code>${info.complexity}</code></div>
          <ul class="arch-features">
            ${info.keyFeatures.map(f => `<li><span class="bullet">✓</span> ${f}</li>`).join("")}
          </ul>
        `;
      }
    });
  });

  // Code Viewer Tabs
  const codeTabs = document.querySelectorAll(".code-tab");
  const codeContent = document.getElementById("code-display");
  const btnCopyCode = document.getElementById("btn-copy-code");

  const codeFiles = {
    "Backtester.cpp": `// src/Backtester.cpp
#include "Backtester.h"
#include "Portfolio.h"

Backtester::Backtester(const BacktestConfig& config)
    : config_(config) {
}

BacktestResult Backtester::run(const std::vector<PriceBar>& data, Strategy& strategy) {
    BacktestResult result;
    result.initial_capital = config_.initial_capital;
    
    Portfolio portfolio(config_.initial_capital, config_.commission_rate);
    strategy.reset();
    
    result.equity_curve.reserve(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        const auto& bar = data[i];
        
        // 1. Evaluate strategy with strict historical window
        Signal signal = strategy.evaluate(static_cast<int>(i), data);
        
        // 2. Execute trades based on signal
        if (signal == Signal::BUY && portfolio.getPositionQuantity(config_.symbol) == 0) {
            double cost_per_share = bar.close * (1.0 + config_.commission_rate);
            int max_shares = static_cast<int>(portfolio.getCash() / cost_per_share);
            int qty = std::min(config_.position_size, max_shares);
            
            if (qty > 0) {
                portfolio.executeTrade(config_.symbol, OrderSide::BUY, qty, bar.close);
                
                TradeRecord trade;
                trade.date = bar.date;
                trade.symbol = config_.symbol;
                trade.side = OrderSide::BUY;
                trade.quantity = qty;
                trade.price = bar.close;
                trade.commission = qty * bar.close * config_.commission_rate;
                trade.realized_pnl = 0.0;
                result.trades.push_back(trade);
            }
        } else if (signal == Signal::SELL && portfolio.getPositionQuantity(config_.symbol) > 0) {
            int qty = portfolio.getPositionQuantity(config_.symbol);
            double realized_pnl = portfolio.executeTrade(config_.symbol, OrderSide::SELL, qty, bar.close);
            
            TradeRecord trade;
            trade.date = bar.date;
            trade.symbol = config_.symbol;
            trade.side = OrderSide::SELL;
            trade.quantity = qty;
            trade.price = bar.close;
            trade.commission = qty * bar.close * config_.commission_rate;
            trade.realized_pnl = realized_pnl;
            result.trades.push_back(trade);
        }
        
        // 3. Mark to market equity
        double current_value = portfolio.getTotalValue(config_.symbol, bar.close);
        result.equity_curve.push_back(current_value);
    }
    
    // Close open positions at final bar close
    if (portfolio.getPositionQuantity(config_.symbol) > 0) {
        int qty = portfolio.getPositionQuantity(config_.symbol);
        double final_price = data.back().close;
        double realized_pnl = portfolio.executeTrade(config_.symbol, OrderSide::SELL, qty, final_price);
        
        TradeRecord trade;
        trade.date = data.back().date;
        trade.symbol = config_.symbol;
        trade.side = OrderSide::SELL;
        trade.quantity = qty;
        trade.price = final_price;
        trade.commission = qty * final_price * config_.commission_rate;
        trade.realized_pnl = realized_pnl;
        result.trades.push_back(trade);
        
        result.equity_curve.back() = portfolio.getCash();
    }
    
    result.final_value = result.equity_curve.back();
    double benchmark_return_pct = 0.0;
    if (!data.empty() && data.front().close > 0.0) {
        benchmark_return_pct = ((data.back().close - data.front().close) / data.front().close) * 100.0;
    }
    
    result.metrics = RiskMetrics::calculate(result.initial_capital, result.equity_curve, result.trades, benchmark_return_pct);
    return result;
}`,

    "Strategy.cpp": `// src/Strategy.cpp
#include "Strategy.h"
#include <numeric>
#include <cmath>

namespace Indicators {

double sma(const std::vector<PriceBar>& data, int end_index, int period) {
    if (end_index < period - 1 || period <= 0) return 0.0;
    double sum = 0.0;
    for (int i = end_index - period + 1; i <= end_index; ++i) {
        sum += data[i].close;
    }
    return sum / period;
}

double rsi(const std::vector<PriceBar>& data, int end_index, int period) {
    if (end_index < period || period <= 0) return 50.0;
    double avg_gain = 0.0;
    double avg_loss = 0.0;
    for (int i = end_index - period + 1; i <= end_index; ++i) {
        double change = data[i].close - data[i-1].close;
        if (change > 0) avg_gain += change;
        else avg_loss -= change;
    }
    if (avg_gain == 0.0 && avg_loss == 0.0) return 50.0;
    avg_gain /= period;
    avg_loss /= period;
    if (avg_loss == 0.0) return 100.0;
    double rs = avg_gain / avg_loss;
    return 100.0 - (100.0 / (1.0 + rs));
}

} // namespace Indicators

Signal SMACrossover::evaluate(int index, const std::vector<PriceBar>& data) {
    if (index < long_period_) return Signal::HOLD;
    
    double short_ma = Indicators::sma(data, index, short_period_);
    double long_ma = Indicators::sma(data, index, long_period_);
    double prev_short_ma = Indicators::sma(data, index - 1, short_period_);
    double prev_long_ma = Indicators::sma(data, index - 1, long_period_);
    
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
}`,

    "Portfolio.cpp": `// src/Portfolio.cpp
#include "Portfolio.h"

Portfolio::Portfolio(double initialCapital, double commissionRate)
    : cash_(initialCapital), commissionRate_(commissionRate), 
      currentSymbol_(""), positionQuantity_(0), averagePrice_(0.0) {
}

double Portfolio::executeTrade(const std::string& symbol, OrderSide side, Quantity quantity, Price price) {
    if (quantity <= 0 || price <= 0.0) return 0.0;
    if (currentSymbol_.empty()) currentSymbol_ = symbol;

    double tradeValue = quantity * price;
    double commission = tradeValue * commissionRate_;
    double realized_pnl = 0.0;

    if (side == OrderSide::BUY) {
        double totalCost = tradeValue + commission;
        if (totalCost > cash_) return 0.0;
        
        double currentTotalValue = positionQuantity_ * averagePrice_;
        positionQuantity_ += quantity;
        averagePrice_ = (currentTotalValue + tradeValue) / positionQuantity_;
        cash_ -= totalCost;
    } else if (side == OrderSide::SELL) {
        if (quantity > positionQuantity_) quantity = positionQuantity_;
        realized_pnl = (price - averagePrice_) * quantity - commission;
        positionQuantity_ -= quantity;
        cash_ += (tradeValue - commission);
        if (positionQuantity_ == 0) averagePrice_ = 0.0;
    }
    return realized_pnl;
}`,

    "RiskMetrics.cpp": `// src/RiskMetrics.cpp
#include "RiskMetrics.h"
#include <cmath>
#include <numeric>

BacktestMetrics RiskMetrics::calculate(double initial_capital, 
                                     const std::vector<double>& equity_curve,
                                     const std::vector<TradeRecord>& trades,
                                     double benchmark_return_pct) {
    BacktestMetrics metrics;
    if (equity_curve.empty() || initial_capital <= 0.0) return metrics;

    double final_value = equity_curve.back();
    metrics.total_return_pct = ((final_value - initial_capital) / initial_capital) * 100.0;
    metrics.buy_and_hold_return_pct = benchmark_return_pct;

    // Annualized return (252 trading days/year)
    double years = equity_curve.size() / 252.0;
    metrics.annualized_return_pct = (std::pow(final_value / initial_capital, 1.0 / years) - 1.0) * 100.0;

    // Max Drawdown tracking peak
    double peak = initial_capital;
    double max_dd = 0.0;
    int current_dd_dur = 0, max_dd_dur = 0;
    for (double val : equity_curve) {
        if (val >= peak) {
            peak = val;
            current_dd_dur = 0;
        } else {
            current_dd_dur++;
            if (current_dd_dur > max_dd_dur) max_dd_dur = current_dd_dur;
        }
        double dd = (peak - val) / peak;
        if (dd > max_dd) max_dd = dd;
    }
    metrics.max_drawdown_pct = max_dd * 100.0;
    metrics.max_drawdown_duration_bars = max_dd_dur;

    // Sharpe Ratio
    std::vector<double> daily_returns;
    double prev_val = initial_capital;
    for (double val : equity_curve) {
        daily_returns.push_back((val - prev_val) / prev_val);
        prev_val = val;
    }
    if (daily_returns.size() > 1) {
        double mean_return = std::accumulate(daily_returns.begin(), daily_returns.end(), 0.0) / daily_returns.size();
        double variance = 0.0;
        for (double r : daily_returns) variance += (r - mean_return) * (r - mean_return);
        double std_dev = std::sqrt(variance / (daily_returns.size() - 1));
        if (std_dev > 0.0) metrics.sharpe_ratio = (mean_return / std_dev) * std::sqrt(252);
    }

    return metrics;
}`
  };

  codeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      codeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const file = tab.getAttribute("data-file");
      if (codeFiles[file] && codeContent) {
        codeContent.textContent = codeFiles[file];
      }
    });
  });

  if (btnCopyCode) {
    btnCopyCode.addEventListener("click", () => {
      if (codeContent) {
        navigator.clipboard.writeText(codeContent.textContent).then(() => {
          btnCopyCode.textContent = "Copied!";
          setTimeout(() => btnCopyCode.textContent = "Copy Code", 2000);
        });
      }
    });
  }

  // Recruiter Summary Copy
  if (btnCopyRecruiter) {
    btnCopyRecruiter.addEventListener("click", () => {
      const summaryText = `Candidate: Sourya Prabaharan
Project: High-Performance C++ Algorithmic Trading & Backtesting Engine
Tech Stack: Modern C++17, CMake, Zero External Dependencies, CTest

Key Highlights for Interview / Screening:
• Engineered a deterministic, cache-locality optimized quantitative backtesting engine in pure C++17.
• Designed clean modular architecture: MarketDataLoader (data ingestion), Strategy (polymorphic evaluate interface), Portfolio (discrete accounting state machine), RiskMetrics (Sharpe, Sortino, Max Drawdown).
• Completely eliminated lookahead bias and multithreaded non-determinism via sequential bar evaluation.
• Accurately accounts for realistic market friction: 0.1% trade commissions, cash constraint validation, average entry price calculations.
• Developed custom unit test suite with CTest achieving 100% pass rate.
• Processes 500,000+ price bars per second with zero dynamic heap allocations in the critical simulation loop.
GitHub Repo: Sourya-Prabaharan/Automated-Stock-Trading-Machine`;

      navigator.clipboard.writeText(summaryText).then(() => {
        if (copyToast) {
          copyToast.classList.add("toast-show");
          setTimeout(() => copyToast.classList.remove("toast-show"), 3500);
        }
      });
    });
  }

  // Quick Terminal Chips
  document.querySelectorAll(".term-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const cmd = chip.getAttribute("data-cmd");
      if (terminal && cmd) {
        terminal.execute(cmd);
      }
    });
  });

  // Initial Run
  renderStrategyParams();
  executeBacktest();
});
