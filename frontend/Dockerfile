# Simple single-stage build for React (Vite) frontend dev/demo
FROM node:20-alpine

WORKDIR /app

# Copy package.json and lock file first for better caching
COPY package*.json ./

# Copy env file before build so Vite picks it up
COPY .env.frontend .env

# Copy rest of frontend files
COPY . .

# Install all dependencies (incl. tailwindcss, postcss, autoprefixer as devDependencies)
RUN npm install --legacy-peer-deps

# Build for production (output to /app/dist)
RUN npm run build -- --outDir=/app/dist

# Add a marker file to verify assets were correctly built (optional)
RUN echo "Frontend assets successfully built at $(date)" > /app/dist/build-info.txt

EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
