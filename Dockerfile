# Stage 1: Build Angular app
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Angular app
RUN npm run build -- --configuration production

# Stage 2: Serve the app using Nginx
FROM nginx:1.26-alpine

# Copy the build output from the previous stage
COPY --from=build /app/dist/monitor_totem/browser /usr/share/nginx/html

# Copy the git.properties file
COPY --from=build /app/git.properties /usr/share/nginx/html

# Copy custom nginx configuration
COPY --from=build /app/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY --from=build /app/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Default command to run entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
