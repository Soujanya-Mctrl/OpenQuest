FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm install

# Build the Types shared components
COPY . .
WORKDIR /app/packages/shared-types
RUN npm run build

# Boot the Express app
WORKDIR /app/apps/api
CMD ["npm", "run", "dev"]
