FROM node:20-alpine

WORKDIR /app

# For monorepo installs, we copy root package config as well as package.json stubs
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm install

# Copy source
COPY . .

# Build the Web shared components
WORKDIR /app/packages/shared-types
RUN npm run build

# Build the Next.js app
WORKDIR /app/apps/web
RUN npm run build

CMD ["npm", "run", "dev"]
