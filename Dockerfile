FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY scripts/sw-template.js ./scripts/sw-template.js
ARG VITE_PUBLIC_APP_URL
ARG VITE_APP_NAME=CineVerse
ENV VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL VITE_APP_NAME=$VITE_APP_NAME
RUN npm run build
FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
COPY THIRD_PARTY_NOTICES.md DEPENDENCY_LICENSES.txt SOURCE-LICENSE.md ./licenses/
USER node
EXPOSE 8787
CMD ["node", "server/index.mjs"]
