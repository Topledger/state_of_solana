# State of Solana Dashboard

An interactive dashboard displaying key metrics and visualizations for the Solana blockchain ecosystem, focusing on DeFi and DEX activity.

## Features

- Real-time metrics for TVL, volume, and trader activity
- Interactive time-series charts with customizable time filters
- DEX program category breakdown
- CSV data exports for further analysis
- Responsive design for desktop and mobile viewing
- Admin panel to dynamically add and configure charts
- PostgreSQL database for persistent chart storage

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
- Prisma with PostgreSQL

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/state_of_solana.git
cd state_of_solana
```

2. Install dependencies:
```bash
npm install
```

3. Set up your PostgreSQL database:
   - Create a PostgreSQL database
   - Copy `.env.sample` to `.env` and update the `DATABASE_URL` with your database credentials:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/solana_charts?schema=public"
   ```

4. Initialize the database:
```bash
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment Options

### Vercel or Netlify Deployment

1. Connect your GitHub repository to Vercel or Netlify
2. Add the `DATABASE_URL` environment variable pointing to your PostgreSQL instance
3. Deploy the application

### Railway or Heroku Deployment

Both platforms provide PostgreSQL add-ons that can be easily integrated:

1. Create a new project on Railway/Heroku
2. Add a PostgreSQL database through their add-ons
3. Connect your GitHub repository
4. The database connection string will be automatically added to your environment variables
5. Deploy the application

### Self-Hosted Deployment

1. Set up a server with Node.js and PostgreSQL
2. Clone the repository and install dependencies
3. Create a production build:
```bash
npm run build
```
4. Start the server:
```bash
npm start
```

## Admin Panel

Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin) to:

- Create new charts with a simple form interface
- Add charts to any page in the dashboard
- Configure data sources for each chart
- Preview charts during creation

## Data Sources

This dashboard uses data from TopLedger's analytics API to provide accurate and up-to-date metrics on Solana's DeFi ecosystem.

## License

MIT
