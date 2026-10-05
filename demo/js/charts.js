/**
 * Titan Quant Engine - Custom Financial Canvas Charting Engine
 * High-performance, Retina 60fps canvas renderer with zero external dependencies.
 */

class QuantCharts {
  constructor() {
    this.priceCanvas = null;
    this.oscCanvas = null;
    this.equityCanvas = null;
    this.drawdownCanvas = null;
    
    this.result = null;
    this.currentBarIndex = null; // null means render all
    this.chartMode = "candlestick"; // "candlestick" or "line"
    this.hoverIndex = -1;
    this.listenersAttached = false;
  }

  init(priceCanvasId, oscCanvasId, equityCanvasId, drawdownCanvasId) {
    this.priceCanvas = document.getElementById(priceCanvasId);
    this.oscCanvas = document.getElementById(oscCanvasId);
    this.equityCanvas = document.getElementById(equityCanvasId);
    this.drawdownCanvas = document.getElementById(drawdownCanvasId);

    if (!this.listenersAttached) {
      this.attachCrosshairListeners();
      window.addEventListener("resize", () => this.render());
      this.listenersAttached = true;
    }
  }

  setData(result, maxBarIndex = null) {
    this.result = result;
    this.currentBarIndex = maxBarIndex;
    this.render();
  }

  setChartMode(mode) {
    this.chartMode = mode;
    this.render();
  }

  attachCrosshairListeners() {
    if (!this.priceCanvas) return;

    const handlePointerMove = (e) => {
      if (!this.result || !this.result.bars) return;
      const rect = this.priceCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      const barsToRender = this.currentBarIndex !== null 
        ? this.result.bars.slice(0, this.currentBarIndex + 1) 
        : this.result.bars;

      const paddingLeft = 55;
      const paddingRight = 65;
      const chartWidth = rect.width - paddingLeft - paddingRight;

      if (x >= paddingLeft && x <= rect.width - paddingRight && barsToRender.length > 0) {
        const step = chartWidth / (barsToRender.length - 1 || 1);
        let idx = Math.round((x - paddingLeft) / step);
        idx = Math.max(0, Math.min(idx, barsToRender.length - 1));
        this.hoverIndex = idx;
        this.updateHud(idx);
      } else {
        this.hoverIndex = -1;
        this.updateHud(-1);
      }
      this.render();
    };

    const handlePointerLeave = () => {
      this.hoverIndex = -1;
      this.updateHud(-1);
      this.render();
    };

    this.priceCanvas.addEventListener("mousemove", handlePointerMove);
    this.priceCanvas.addEventListener("mouseleave", handlePointerLeave);

    if (this.equityCanvas) {
      this.equityCanvas.addEventListener("mousemove", (e) => {
        if (!this.result || !this.result.bars) return;
        const rect = this.equityCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const barsToRender = this.currentBarIndex !== null 
          ? this.result.bars.slice(0, this.currentBarIndex + 1) 
          : this.result.bars;
        const paddingLeft = 65;
        const paddingRight = 65;
        const chartWidth = rect.width - paddingLeft - paddingRight;
        if (x >= paddingLeft && x <= rect.width - paddingRight && barsToRender.length > 0) {
          const step = chartWidth / (barsToRender.length - 1 || 1);
          let idx = Math.round((x - paddingLeft) / step);
          this.hoverIndex = Math.max(0, Math.min(idx, barsToRender.length - 1));
          this.updateHud(this.hoverIndex);
          this.render();
        }
      });
      this.equityCanvas.addEventListener("mouseleave", handlePointerLeave);
    }
  }

  updateHud(idx) {
    const hud = document.getElementById("chart-hud");
    if (!hud) return;

    if (idx < 0 || !this.result || !this.result.bars[idx]) {
      const lastIdx = (this.currentBarIndex !== null ? this.currentBarIndex : (this.result ? this.result.bars.length - 1 : -1));
      if (lastIdx >= 0 && this.result.bars[lastIdx]) {
        this.renderHudContent(hud, lastIdx, false);
      }
      return;
    }
    this.renderHudContent(hud, idx, true);
  }

  renderHudContent(hud, idx, isHover) {
    const bar = this.result.bars[idx];
    const ind = this.result.indicators[idx] || {};
    const equity = this.result.equityCurve[idx];
    const initial = this.result.initialCapital;
    const pnl = equity - initial;
    const pnlPct = (pnl / initial) * 100;
    const isUp = bar.close >= bar.open;

    let indHtml = "";
    if (ind.smaFast !== undefined && ind.smaFast !== null) {
      indHtml += `<span class="hud-tag cyan">Fast SMA: $${ind.smaFast.toFixed(2)}</span>`;
    }
    if (ind.smaSlow !== undefined && ind.smaSlow !== null) {
      indHtml += `<span class="hud-tag purple">Slow SMA: $${ind.smaSlow.toFixed(2)}</span>`;
    }
    if (ind.rsi !== undefined) {
      indHtml += `<span class="hud-tag amber">RSI(14): ${ind.rsi.toFixed(1)}</span>`;
    }
    if (ind.bbMiddle !== undefined) {
      indHtml += `<span class="hud-tag cyan">BB Mid: $${ind.bbMiddle.toFixed(2)}</span>`;
    }

    hud.innerHTML = `
      <div class="hud-item date"><span class="hud-label">DATE</span> <span class="hud-val">${bar.date}</span></div>
      <div class="hud-item ohlc">
        <span>O: <b>$${bar.open.toFixed(2)}</b></span>
        <span>H: <b>$${bar.high.toFixed(2)}</b></span>
        <span>L: <b>$${bar.low.toFixed(2)}</b></span>
        <span class="${isUp ? 'text-emerald' : 'text-rose'}">C: <b>$${bar.close.toFixed(2)}</b></span>
      </div>
      <div class="hud-item indicators">${indHtml}</div>
      <div class="hud-item equity">
        <span class="hud-label">EQUITY</span> 
        <span class="hud-val ${pnl >= 0 ? 'text-emerald' : 'text-rose'}">$${equity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)</span>
      </div>
    `;
  }

  prepCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  render() {
    if (!this.result || !this.result.bars || this.result.bars.length === 0) return;

    const maxIdx = this.currentBarIndex !== null ? this.currentBarIndex : this.result.bars.length - 1;
    const visibleBars = this.result.bars.slice(0, maxIdx + 1);
    const visibleEquity = this.result.equityCurve.slice(0, maxIdx + 1);
    const visibleBenchmark = this.result.benchmarkEquity.slice(0, maxIdx + 1);
    const visibleIndicators = this.result.indicators.slice(0, maxIdx + 1);
    const visibleTrades = this.result.trades.filter(t => t.barIndex <= maxIdx);

    this.renderPriceChart(visibleBars, visibleIndicators, visibleTrades);
    this.renderOscillatorChart(visibleBars, visibleIndicators);
    this.renderEquityChart(visibleBars, visibleEquity, visibleBenchmark);
    this.renderDrawdownChart(visibleBars, visibleEquity);

    if (this.hoverIndex === -1) {
      this.updateHud(maxIdx);
    }
  }

  renderPriceChart(bars, indicators, trades) {
    const setup = this.prepCanvas(this.priceCanvas);
    if (!setup || bars.length === 0) return;
    const { ctx, width, height } = setup;

    const padTop = 25;
    const padBottom = 30;
    const padLeft = 55;
    const padRight = 65;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Determine min/max price
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (let i = 0; i < bars.length; ++i) {
      if (bars[i].low < minPrice) minPrice = bars[i].low;
      if (bars[i].high > maxPrice) maxPrice = bars[i].high;
      const ind = indicators[i];
      if (ind) {
        if (ind.smaFast) { minPrice = Math.min(minPrice, ind.smaFast); maxPrice = Math.max(maxPrice, ind.smaFast); }
        if (ind.smaSlow) { minPrice = Math.min(minPrice, ind.smaSlow); maxPrice = Math.max(maxPrice, ind.smaSlow); }
        if (ind.bbUpper) { maxPrice = Math.max(maxPrice, ind.bbUpper); }
        if (ind.bbLower) { minPrice = Math.min(minPrice, ind.bbLower); }
      }
    }

    const priceBuffer = (maxPrice - minPrice) * 0.08 || 1;
    minPrice -= priceBuffer;
    maxPrice += priceBuffer;

    const getY = (val) => padTop + plotH - ((val - minPrice) / (maxPrice - minPrice)) * plotH;
    const getX = (idx) => padLeft + (idx / (bars.length - 1 || 1)) * plotW;

    // Draw Grid Lines & Y-Axis labels
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";

    const yTicks = 5;
    for (let i = 0; i <= yTicks; ++i) {
      const p = minPrice + (i / yTicks) * (maxPrice - minPrice);
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(`$${p.toFixed(2)}`, width - padRight + 6, y + 4);
    }

    // X-Axis date labels
    const xTickCount = Math.min(6, bars.length);
    ctx.textAlign = "center";
    for (let i = 0; i < xTickCount; ++i) {
      const idx = Math.floor(i * (bars.length - 1) / (xTickCount - 1 || 1));
      const x = getX(idx);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.fillText(bars[idx].date.slice(5), x, height - 10);
    }

    // Render Bollinger Bands Cloud if present
    if (indicators[0] && indicators[0].bbUpper !== undefined) {
      ctx.fillStyle = "rgba(6, 182, 212, 0.06)";
      ctx.beginPath();
      for (let i = 0; i < bars.length; ++i) {
        const ind = indicators[i];
        if (ind && ind.bbUpper) {
          const x = getX(i);
          const y = getY(ind.bbUpper);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      for (let i = bars.length - 1; i >= 0; --i) {
        const ind = indicators[i];
        if (ind && ind.bbLower) {
          const x = getX(i);
          const y = getY(ind.bbLower);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Lower/Upper lines
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
      ctx.beginPath();
      for (let i = 0; i < bars.length; ++i) {
        if (indicators[i] && indicators[i].bbUpper) {
          const x = getX(i);
          const y = getY(indicators[i].bbUpper);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < bars.length; ++i) {
        if (indicators[i] && indicators[i].bbLower) {
          const x = getX(i);
          const y = getY(indicators[i].bbLower);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Render Price Bars / Line
    if (this.chartMode === "candlestick") {
      const candleW = Math.max(2, Math.min(10, (plotW / bars.length) * 0.7));
      for (let i = 0; i < bars.length; ++i) {
        const bar = bars[i];
        const x = getX(i);
        const yOpen = getY(bar.open);
        const yClose = getY(bar.close);
        const yHigh = getY(bar.high);
        const yLow = getY(bar.low);
        const isUp = bar.close >= bar.open;

        ctx.strokeStyle = isUp ? "#10b981" : "#f43f5e";
        ctx.fillStyle = isUp ? "#10b981" : "#f43f5e";
        ctx.lineWidth = 1;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Body
        const topY = Math.min(yOpen, yClose);
        const bodyH = Math.max(1.5, Math.abs(yOpen - yClose));
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
      }
    } else {
      // Area / Line chart
      const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.35)");
      grad.addColorStop(1, "rgba(59, 130, 246, 0.0)");

      ctx.beginPath();
      ctx.moveTo(getX(0), height - padBottom);
      for (let i = 0; i < bars.length; ++i) {
        ctx.lineTo(getX(i), getY(bars[i].close));
      }
      ctx.lineTo(getX(bars.length - 1), height - padBottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      for (let i = 0; i < bars.length; ++i) {
        const x = getX(i);
        const y = getY(bars[i].close);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Render Fast SMA line (Cyan)
    if (indicators[0] && indicators[0].smaFast !== undefined) {
      ctx.beginPath();
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.8;
      let started = false;
      for (let i = 0; i < bars.length; ++i) {
        const val = indicators[i].smaFast;
        if (val !== null && val !== undefined) {
          const x = getX(i);
          const y = getY(val);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Render Slow SMA line (Purple)
    if (indicators[0] && indicators[0].smaSlow !== undefined) {
      ctx.beginPath();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 1.8;
      let started = false;
      for (let i = 0; i < bars.length; ++i) {
        const val = indicators[i].smaSlow;
        if (val !== null && val !== undefined) {
          const x = getX(i);
          const y = getY(val);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Render Trade Signals (Buy = Green Up Arrow, Sell = Red Down Arrow)
    for (const trade of trades) {
      const idx = trade.barIndex;
      if (idx >= bars.length) continue;
      const x = getX(idx);
      const isBuy = trade.side === "BUY";
      const y = isBuy ? getY(bars[idx].low) + 16 : getY(bars[idx].high) - 16;

      ctx.save();
      ctx.fillStyle = isBuy ? "#10b981" : "#f43f5e";
      ctx.strokeStyle = "#090d16";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      if (isBuy) {
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x - 6, y + 4);
        ctx.lineTo(x + 6, y + 4);
      } else {
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x - 6, y - 4);
        ctx.lineTo(x + 6, y - 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Signal Tag Pill
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      const pillY = isBuy ? y + 14 : y - 10;
      ctx.fillStyle = isBuy ? "rgba(16, 185, 129, 0.95)" : "rgba(244, 63, 94, 0.95)";
      ctx.fillText(isBuy ? "BUY" : "SELL", x, pillY);
      ctx.restore();
    }

    // Hover Crosshair
    if (this.hoverIndex >= 0 && this.hoverIndex < bars.length) {
      const hx = getX(this.hoverIndex);
      const hy = getY(bars[this.hoverIndex].close);

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, height - padBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padLeft, hy);
      ctx.lineTo(width - padRight, hy);
      ctx.stroke();

      // Dot on price
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderOscillatorChart(bars, indicators) {
    const setup = this.prepCanvas(this.oscCanvas);
    if (!setup || bars.length === 0) return;
    const { ctx, width, height } = setup;

    const padTop = 15;
    const padBottom = 20;
    const padLeft = 55;
    const padRight = 65;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const hasRsi = indicators[0] && indicators[0].rsi !== undefined;
    const hasMacd = indicators[0] && indicators[0].macd !== undefined;

    const getX = (idx) => padLeft + (idx / (bars.length - 1 || 1)) * plotW;

    if (hasRsi) {
      const getY = (val) => padTop + plotH - ((val - 0) / 100) * plotH;

      // 70 and 30 lines
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
      ctx.beginPath();
      ctx.moveTo(padLeft, getY(70));
      ctx.lineTo(width - padRight, getY(70));
      ctx.stroke();

      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.beginPath();
      ctx.moveTo(padLeft, getY(30));
      ctx.lineTo(width - padRight, getY(30));
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText("70 (OB)", width - padRight + 6, getY(70) + 3);
      ctx.fillText("30 (OS)", width - padRight + 6, getY(30) + 3);

      // Shaded zone between 30 and 70
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(padLeft, getY(70), plotW, getY(30) - getY(70));

      // RSI Curve
      ctx.beginPath();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.8;
      for (let i = 0; i < bars.length; ++i) {
        const val = indicators[i].rsi || 50;
        const x = getX(i);
        const y = getY(val);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (hasMacd) {
      // Find min/max for MACD
      let minM = -0.5, maxM = 0.5;
      for (const ind of indicators) {
        if (ind && ind.macd !== undefined) {
          minM = Math.min(minM, ind.macd, ind.signal, ind.histogram);
          maxM = Math.max(maxM, ind.macd, ind.signal, ind.histogram);
        }
      }
      const buffer = (maxM - minM) * 0.1 || 0.1;
      minM -= buffer; maxM += buffer;
      const getY = (val) => padTop + plotH - ((val - minM) / (maxM - minM)) * plotH;

      // Zero line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.moveTo(padLeft, getY(0));
      ctx.lineTo(width - padRight, getY(0));
      ctx.stroke();

      // Histogram
      const barW = Math.max(2, (plotW / bars.length) * 0.7);
      for (let i = 0; i < bars.length; ++i) {
        const ind = indicators[i];
        if (ind && ind.histogram !== undefined) {
          const x = getX(i);
          const yVal = getY(ind.histogram);
          const yZero = getY(0);
          ctx.fillStyle = ind.histogram >= 0 ? "rgba(16, 185, 129, 0.6)" : "rgba(244, 63, 94, 0.6)";
          ctx.fillRect(x - barW / 2, Math.min(yVal, yZero), barW, Math.abs(yVal - yZero));
        }
      }

      // MACD & Signal line
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < bars.length; ++i) {
        if (indicators[i] && indicators[i].macd !== undefined) {
          const x = getX(i);
          const y = getY(indicators[i].macd);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < bars.length; ++i) {
        if (indicators[i] && indicators[i].signal !== undefined) {
          const x = getX(i);
          const y = getY(indicators[i].signal);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    } else {
      // Default volume bars or placeholder
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Strategy indicator telemetry active (Moving Averages overlaid on primary pane)", width / 2, height / 2);
    }
  }

  renderEquityChart(bars, equityCurve, benchmarkEquity) {
    const setup = this.prepCanvas(this.equityCanvas);
    if (!setup || bars.length === 0) return;
    const { ctx, width, height } = setup;

    const padTop = 25;
    const padBottom = 25;
    const padLeft = 65;
    const padRight = 65;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < equityCurve.length; ++i) {
      minVal = Math.min(minVal, equityCurve[i], benchmarkEquity[i]);
      maxVal = Math.max(maxVal, equityCurve[i], benchmarkEquity[i]);
    }

    const buffer = (maxVal - minVal) * 0.1 || 1000;
    minVal -= buffer;
    maxVal += buffer;

    const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
    const getX = (idx) => padLeft + (idx / (bars.length - 1 || 1)) * plotW;

    // Y Axis Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";

    const yTicks = 4;
    for (let i = 0; i <= yTicks; ++i) {
      const v = minVal + (i / yTicks) * (maxVal - minVal);
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(`$${(v / 1000).toFixed(1)}k`, width - padRight + 6, y + 4);
    }

    // Benchmark Curve (Dashed Slate)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < benchmarkEquity.length; ++i) {
      const x = getX(i);
      const y = getY(benchmarkEquity[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // High-Water Mark Peak Line
    ctx.save();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    let peak = equityCurve[0];
    for (let i = 0; i < equityCurve.length; ++i) {
      peak = Math.max(peak, equityCurve[i]);
      const x = getX(i);
      const y = getY(peak);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Strategy Equity Area Gradient
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    grad.addColorStop(0, "rgba(16, 185, 129, 0.28)");
    grad.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    ctx.beginPath();
    ctx.moveTo(getX(0), height - padBottom);
    for (let i = 0; i < equityCurve.length; ++i) {
      ctx.lineTo(getX(i), getY(equityCurve[i]));
    }
    ctx.lineTo(getX(equityCurve.length - 1), height - padBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Strategy Equity Line
    ctx.beginPath();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < equityCurve.length; ++i) {
      const x = getX(i);
      const y = getY(equityCurve[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Hover indicator
    if (this.hoverIndex >= 0 && this.hoverIndex < equityCurve.length) {
      const hx = getX(this.hoverIndex);
      const hy = getY(equityCurve[this.hoverIndex]);
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderDrawdownChart(bars, equityCurve) {
    const setup = this.prepCanvas(this.drawdownCanvas);
    if (!setup || bars.length === 0) return;
    const { ctx, width, height } = setup;

    const padTop = 15;
    const padBottom = 20;
    const padLeft = 65;
    const padRight = 65;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Calculate drawdown array
    let peak = equityCurve[0];
    const drawdowns = [];
    let maxDd = 0.01;

    for (let i = 0; i < equityCurve.length; ++i) {
      peak = Math.max(peak, equityCurve[i]);
      const dd = ((peak - equityCurve[i]) / peak) * 100.0;
      drawdowns.push(dd);
      if (dd > maxDd) maxDd = dd;
    }

    const getY = (val) => padTop + (val / maxDd) * plotH;
    const getX = (idx) => padLeft + (idx / (bars.length - 1 || 1)) * plotW;

    // 0% line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(width - padRight, padTop);
    ctx.stroke();

    // Fill Underwater Area
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    grad.addColorStop(0, "rgba(244, 63, 94, 0.05)");
    grad.addColorStop(1, "rgba(244, 63, 94, 0.35)");

    ctx.beginPath();
    ctx.moveTo(getX(0), padTop);
    for (let i = 0; i < drawdowns.length; ++i) {
      ctx.lineTo(getX(i), getY(drawdowns[i]));
    }
    ctx.lineTo(getX(drawdowns.length - 1), padTop);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Drawdown line
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < drawdowns.length; ++i) {
      const x = getX(i);
      const y = getY(drawdowns[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = "rgba(244, 63, 94, 0.8)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Max: -${maxDd.toFixed(2)}%`, width - padRight + 6, height - 10);
    ctx.fillText(`0.0%`, width - padRight + 6, padTop + 4);
  }
}

if (typeof window !== "undefined") {
  window.QuantCharts = QuantCharts;
}
