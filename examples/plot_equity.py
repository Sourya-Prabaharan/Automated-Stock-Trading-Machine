import pandas as pd
import matplotlib.pyplot as plt
import os
import sys

def plot_equity(csv_path="data/equity_curve.csv", output_path="docs/screenshots/equity_curve.png"):
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found. Run the backtester first.")
        sys.exit(1)
        
    df = pd.DataFrame()
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        sys.exit(1)
        
    if 'Date' not in df.columns or 'Equity' not in df.columns:
        print("Error: CSV must contain 'Date' and 'Equity' columns.")
        sys.exit(1)

    df['Date'] = pd.to_datetime(df['Date'])
    
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(10, 6))
    
    ax.plot(df['Date'], df['Equity'], color='#00ffcc', linewidth=2)
    ax.fill_between(df['Date'], df['Equity'], df['Equity'].min() * 0.99, color='#00ffcc', alpha=0.1)
    
    ax.set_title("Portfolio Equity Curve", fontsize=16, fontweight='bold', color='white', pad=20)
    ax.set_ylabel("Portfolio Value ($)", fontsize=12, color='lightgrey')
    ax.set_xlabel("Date", fontsize=12, color='lightgrey')
    
    # Clean up the grid and spines
    ax.grid(color='#333333', linestyle='--', linewidth=0.5, alpha=0.7)
    for spine in ax.spines.values():
        spine.set_color('#333333')
        
    ax.tick_params(colors='lightgrey', which='both')
    
    # Format Y-axis to show dollar amounts nicely
    ax.yaxis.set_major_formatter('${x:,.0f}')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='#111111')
    print(f"Saved plot to {output_path}")

if __name__ == "__main__":
    # If run directly from root
    plot_equity()
