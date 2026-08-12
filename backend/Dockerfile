# Use a small, pinned Node base image — never use ":latest" in real projects,
# it silently changes underneath you and breaks reproducible builds.
FROM node:20-alpine

WORKDIR /app

# Copy only the dependency manifests first so Docker can cache the
# npm install layer — it only re-runs when package.json actually changes,
# not every time you edit a route file.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Now copy the rest of the source.
COPY . .

# The app itself decides the port via $PORT; 4000 is just the documented default.
EXPOSE 4000

# Run as a non-root user — a basic security practice production images follow.
USER node

CMD ["node", "src/server.js"]
