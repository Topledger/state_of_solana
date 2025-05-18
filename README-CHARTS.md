# Charts Storage Setup

This application uses localStorage in development mode and a PostgreSQL database in production for storing chart configurations.

## Configuration

The chart storage mode is controlled by the `.env.local` file:

```
# Storage mode: Use "true" for localStorage, "false" for database
NEXT_PUBLIC_USE_LOCAL_STORAGE="true"
```

- When set to `"true"`, charts are stored in the browser's localStorage (default for development)
- When set to `"false"`, charts are stored in a PostgreSQL database (recommended for production)

## Development Setup

For local development, you can use the default localStorage method:

1. Set `NEXT_PUBLIC_USE_LOCAL_STORAGE="true"` in `.env.local` (this is the default)
2. Run the app as normal with `npm run dev`

All charts created in the chart creator will be stored in localStorage.

## Production Setup with Database

For production deployment or if you want to share charts across users, set up the database:

1. Install PostgreSQL and create a database
2. Update the `.env.local` file with your database connection string:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name"
   NEXT_PUBLIC_USE_LOCAL_STORAGE="false"
   ```
3. Run database migrations to create the necessary tables:
   ```
   npm run db:generate
   npm run db:migrate
   ```
4. Run the app with `npm run dev` or `npm run build && npm run start`

## Database Management

The following NPM scripts are available for database management:

- `npm run db:generate` - Generate Prisma client based on your schema
- `npm run db:migrate` - Create and run migrations when you make schema changes
- `npm run db:studio` - Open Prisma Studio to view/edit database records

## Migrating Charts from localStorage to Database

If you've been using localStorage and want to move your charts to the database:

1. In your browser console, run:
   ```javascript
   const charts = JSON.parse(localStorage.getItem('solana-charts'))
   console.log(JSON.stringify(charts, null, 2))
   ```

2. Copy the output and save it as `charts.json`

3. Create a script called `scripts/import-charts.js`:

   ```javascript
   const { PrismaClient } = require('@prisma/client');
   const fs = require('fs');

   const prisma = new PrismaClient();
   const charts = JSON.parse(fs.readFileSync('./charts.json', 'utf8'));

   async function importCharts() {
     for (const chart of charts) {
       await prisma.chart.create({
         data: {
           id: chart.id,
           title: chart.title,
           page: chart.page,
           config: JSON.stringify(chart),
           createdAt: new Date(chart.createdAt),
           updatedAt: new Date(chart.updatedAt)
         }
       });
       console.log(`Imported chart: ${chart.title}`);
     }
     console.log('Import complete');
   }

   importCharts()
     .then(() => prisma.$disconnect())
     .catch(e => {
       console.error(e);
       prisma.$disconnect();
       process.exit(1);
     });
   ```

4. Run the script with:
   ```
   node scripts/import-charts.js
   ```

## Troubleshooting

If charts aren't appearing after changing ports or domains:

1. **Development (localStorage)**: Charts are stored per domain+port. If you change from port 3000 to 3001, you'll need to recreate the charts or copy them over.

2. **Production (database)**: Ensure your database connection is working and the `NEXT_PUBLIC_USE_LOCAL_STORAGE` setting is `"false"`. 