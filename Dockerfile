FROM node:18-alpine AS base
WORKDIR /app

# install deps — vendor/ holds the slideshow-mel submodule, which package.json
# references as a file: dependency, so it must be present before npm install.
COPY package.json package-lock.json* ./
COPY vendor ./vendor
RUN npm install --silent

# copy source
COPY . .

FROM base AS builder
RUN npm run build

FROM nginx:stable-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
