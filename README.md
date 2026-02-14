# ECE Tracking Plateforme

A professional-grade financial portfolio management, analytics, and strategy optimization platform.

## 🚀 Features

- **Portfolio Management**: Create and track multiple portfolios with real-time asset pricing.
- **Advanced Analytics**: Interactive performance charts, monthly returns heatmaps, and drawdown analysis.
- **Strategy Optimization**: Integrated Markowitz Efficient Frontier models (Min Volatility, Max Sharpe Ratio).
- **Risk Metrics**: Comprehensive calculation of Sharpe, Sortino, Calmar, Beta, Alpha, and VaR (95/99).
- **Market Data**: Automated syncing of instrument metadata and historical prices via yfinance.
- **Collaboration**: Share portfolios with collaborators with granular permissions (View/Edit).
- **Stress Testing**: Simulate market scenarios (Crash, AI Boom, Inflation) on your holdings.
- **Admin Panel**: User management and platform monitoring.

## 🛠 Tech Stack

- **Backend**: FastAPI, SQLAlchemy (PostgreSQL), Redis (Caching), Alembic (Migrations).
- **Data Science**: Pandas, NumPy, Scikit-learn, PyPortfolioOpt (Optimization).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React (Icons).
- **Visualization**: Recharts (Financial charting).
- **Infrastructure**: Docker & Docker Compose.

## 🏁 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose.

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ECE-Tracking-Plateforme.git
   cd ECE-Tracking-Plateforme
   ```

2. **Configure Environment**:
   Create a `.env` file in the root directory (use standard Postgres/Redis settings):
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=portfolio
   POSTGRES_SERVER=db
   POSTGRES_PORT=5432
   ```

3. **Launch the platform**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Default Credentials
- **Username**: `admin`
- **Password**: `admin`

## 🏗 Project Structure

- `API/`: FastAPI backend with modular service architecture.
- `UI/`: React frontend with a component-based design.
- `docker-compose.yml`: Full stack orchestration.

## 📄 License

MIT

---
Build with ❤️ for ECE Portfolio Management, by Josh E. SOUSSAN
