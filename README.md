# State of Solana Dashboard

An interactive dashboard displaying key metrics and visualizations for the Solana blockchain ecosystem, focusing on DeFi and DEX activity.

## Features

- Real-time metrics for TVL, volume, and trader activity
- Interactive time-series charts with customizable time filters
- DEX program category breakdown
- CSV data exports for further analysis
- Responsive design for desktop and mobile viewing
- Admin panel to dynamically add and configure charts
- Flexible chart storage using either localStorage or database

## Chart Capabilities

The dashboard supports multiple chart types:

- **Bar Charts**: Visualize categorical data with support for stacked variants
- **Line Charts**: Display time series data with interactive tooltips
- **Area Charts**: Show trends with filled areas below the line
- **Stacked Area Charts**: Visualize part-to-whole relationships over time

All charts feature:
- Consistent color schemes based on categories
- Interactive tooltips showing precise values
- Automatic data normalization and field matching
- CSV export functionality

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Visx (for data visualization)
- Prisma (for database storage)

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Panel

Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin) to:

- Create new charts with a simple form interface
- Add charts to any page in the dashboard
- Configure data sources for each chart
- Preview charts during creation

## Chart Storage

Charts created in the admin panel can be stored in two ways:

1. **LocalStorage (Development)**: Charts are stored in the browser's localStorage by default
2. **Database (Production)**: For persistent storage across all users, configure with a PostgreSQL database

See [README-CHARTS.md](README-CHARTS.md) for detailed setup instructions for both storage options.

### Moving Charts Between Environments

If you've created charts on one port or environment (e.g., localhost:3000) and need to move them to another (e.g., localhost:3001 or production):

1. Use the export script in the scripts directory: `node scripts/export-charts.js`
2. Follow the instructions to export charts from your browser's localStorage
3. Import to the new environment using the import script: `node scripts/import-charts.js`

## Data Sources

This dashboard uses data from TopLedger's analytics API to provide accurate and up-to-date metrics on Solana's DeFi ecosystem.

## License

MIT
