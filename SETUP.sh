# Copy this file to .env and update values as needed
cp .env.example .env

# Install dependencies
npm install

# Start PostgreSQL with Docker
docker-compose up -d

# Generate Prisma Client
npx prisma generate

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev

# Open http://localhost:3000
