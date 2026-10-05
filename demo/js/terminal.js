/**
 * Titan Quant Engine - Interactive C++ Terminal Emulator
 * Emulates the exact CLI binary execution and CTest test suite.
 */

class QuantTerminal {
  constructor(containerId, inputId) {
    this.container = document.getElementById(containerId);
    this.input = document.getElementById(inputId);
    this.history = [];
    this.historyIndex = -1;
    this.init();
  }

  init() {
    if (!this.container || !this.input) return;

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = this.input.value.trim();
        this.input.value = "";
        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          this.execute(cmd);
        }
      } else if (e.key === "ArrowUp") {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.input.value = this.history[this.historyIndex];
        }
      } else if (e.key === "ArrowDown") {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.input.value = "";
        }
      }
    });

    this.printWelcome();
  }

  execute(cmd) {
    this.printLine(`<span class="term-prompt">sourya@macbook:build$</span> <span class="term-input-cmd">${this.escapeHtml(cmd)}</span>`);
    const trimmed = cmd.trim();

    if (trimmed === "clear") {
      this.container.innerHTML = "";
      return;
    }

    if (trimmed === "help") {
      this.printLine(`
Available commands:
  <span class="text-cyan">./trading_engine &lt;csv&gt; --strategy sma</span>   Run SMA Crossover (10/30)
  <span class="text-cyan">./trading_engine &lt;csv&gt; --strategy rsi</span>   Run RSI Mean Reversion (14)
  <span class="text-emerald">ctest --output-on-failure</span>               Execute full CTest test suite
  <span class="text-amber">make</span>                                     Simulate CMake compilation
  <span class="text-purple">uname -a</span>                                 System and compiler info
  <span class="text-slate">clear</span>                                    Clear terminal display
      `);
      return;
    }

    if (trimmed.includes("trading_engine") && trimmed.includes("sma")) {
      this.simulateEngineRun("SMA Crossover (10/30)", {
        initialCapital: "$100000.00",
        finalValue: "$100761.46",
        totalReturn: "0.76%",
        benchmark: "31.10%",
        annualized: "0.74%",
        maxDd: "2.19% (99 bars)",
        sharpe: "0.31",
        trades: 4,
        wins: 3,
        losses: 1,
        winRate: "75.00%",
        avgWin: "$559.69",
        avgLoss: "$852.28",
        profitFactor: "1.97"
      });
      return;
    }

    if (trimmed.includes("trading_engine") && trimmed.includes("rsi")) {
      this.simulateEngineRun("RSI Mean Reversion (14)", {
        initialCapital: "$100000.00",
        finalValue: "$100944.17",
        totalReturn: "0.94%",
        benchmark: "31.10%",
        annualized: "0.91%",
        maxDd: "2.93% (151 bars)",
        sharpe: "0.40",
        trades: 2,
        wins: 1,
        losses: 1,
        winRate: "50.00%",
        avgWin: "$1491.56",
        avgLoss: "$514.48",
        profitFactor: "2.90"
      });
      return;
    }

    if (trimmed.startsWith("ctest")) {
      this.simulateCTest();
      return;
    }

    if (trimmed === "make") {
      this.simulateMake();
      return;
    }

    if (trimmed === "uname -a") {
      this.printLine(`<span class="text-slate">Darwin MacBook-Pro.local 24.3.0 Darwin Kernel Version 24.3.0: arm64 C++17 clang-1600.0.26.4</span>`);
      return;
    }

    this.printLine(`<span class="text-rose">zsh: command not found: ${this.escapeHtml(trimmed)}. Type 'help' for available commands.</span>`);
  }

  simulateEngineRun(stratName, m) {
    this.printLine(`<span class="text-cyan">Loading market data from ../data/sample_prices.csv...</span>`);
    this.printLine(`Loaded 260 price bars.`);
    this.printLine(`Running backtest with ${stratName}...`);
    this.printLine(`
<span class="text-emerald">==================================================</span>
<span class="text-emerald font-bold">BACKTEST RESULTS: ${stratName}</span>
<span class="text-emerald">==================================================</span>
Initial Capital:  ${m.initialCapital}
Final Value:      ${m.finalValue}
Total Return:     <span class="text-emerald">${m.totalReturn}</span>
B&H Benchmark:    ${m.benchmark}
Annualized Ret:   ${m.annualized}
Max Drawdown:     <span class="text-rose">${m.maxDd}</span>
Sharpe Ratio:     <span class="text-cyan">${m.sharpe}</span>

<span class="font-bold">Trade Statistics:</span>
Total Trades:     ${m.trades}
Winning Trades:   <span class="text-emerald">${m.wins}</span>
Losing Trades:    <span class="text-rose">${m.losses}</span>
Win Rate:         <span class="text-emerald">${m.winRate}</span>
Average Win:      ${m.avgWin}
Average Loss:     ${m.avgLoss}
Profit Factor:    <span class="text-cyan">${m.profitFactor}</span>
<span class="text-emerald">==================================================</span>
Exported equity curve to ../data/equity_curve.csv
Exported trade history to ../data/trade_history.csv
Execution finished in 1.42ms (Cache hits: 100%, 0 heap allocs in hot loop).
    `);
    this.scrollToBottom();
  }

  simulateCTest() {
    this.printLine(`Test project /Users/sourya/Projects/Automated Stock Trading System/build`);
    this.printLine(`      Start  1: TestCSVParser`);
    this.printLine(` 1/5 Test  #1: TestCSVParser .................... <span class="text-emerald font-bold">Passed</span>    0.01 sec`);
    this.printLine(`      Start  2: TestIndicators`);
    this.printLine(` 2/5 Test  #2: TestIndicators ................... <span class="text-emerald font-bold">Passed</span>    0.01 sec`);
    this.printLine(`      Start  3: TestPortfolio`);
    this.printLine(` 3/5 Test  #3: TestPortfolio .................... <span class="text-emerald font-bold">Passed</span>    0.01 sec`);
    this.printLine(`      Start  4: TestRiskMetrics`);
    this.printLine(` 4/5 Test  #4: TestRiskMetrics .................. <span class="text-emerald font-bold">Passed</span>    0.01 sec`);
    this.printLine(`      Start  5: TestBacktest`);
    this.printLine(` 5/5 Test  #5: TestBacktest ..................... <span class="text-emerald font-bold">Passed</span>    0.01 sec`);
    this.printLine(`
<span class="text-emerald font-bold">100% tests passed, 0 tests failed out of 5</span>
Total Test time (real) =   0.05 sec
    `);
    this.scrollToBottom();
  }

  simulateMake() {
    this.printLine(`[ 20%] <span class="text-cyan">Building CXX object CMakeFiles/trading_lib.dir/src/MarketDataLoader.cpp.o</span>`);
    this.printLine(`[ 40%] <span class="text-cyan">Building CXX object CMakeFiles/trading_lib.dir/src/Strategy.cpp.o</span>`);
    this.printLine(`[ 60%] <span class="text-cyan">Building CXX object CMakeFiles/trading_lib.dir/src/Portfolio.cpp.o</span>`);
    this.printLine(`[ 80%] <span class="text-cyan">Building CXX object CMakeFiles/trading_lib.dir/src/RiskMetrics.cpp.o</span>`);
    this.printLine(`[ 90%] <span class="text-cyan">Linking CXX static library libtrading_lib.a</span>`);
    this.printLine(`[ 95%] <span class="text-cyan">Building CXX object CMakeFiles/trading_engine.dir/src/main.cpp.o</span>`);
    this.printLine(`[100%] <span class="text-emerald font-bold">Linking CXX executable trading_engine</span>`);
    this.printLine(`<span class="text-emerald">Build complete. Zero warnings (-Wall -Wextra -Wpedantic).</span>`);
    this.scrollToBottom();
  }

  printWelcome() {
    this.printLine(`
<span class="text-cyan font-bold">Titan Quant Engine v1.0.0 [C++17 High Performance Trading Core]</span>
Type '<span class="text-emerald">help</span>' for available commands or click the quick action chips below.
    `);
  }

  printLine(html) {
    const div = document.createElement("div");
    div.className = "term-line";
    div.innerHTML = html;
    this.container.appendChild(div);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

if (typeof window !== "undefined") {
  window.QuantTerminal = QuantTerminal;
}
