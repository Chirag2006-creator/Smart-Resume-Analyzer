FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the port
EXPOSE 5173

# Start the Vite development server and expose to network
CMD ["npm", "run", "dev", "--", "--host"]
