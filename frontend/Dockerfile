# Stage 1: build the static React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Bakes the backend URL into the built JS. For local Docker Compose, the
# browser talks to the backend via the host machine's published port.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve the built files with a tiny Nginx image (no Node needed at runtime)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
