FROM node:18-alpine AS base
WORKDIR /app

# install deps
COPY package.json package-lock.json* ./
RUN npm install --silent

# copy source
COPY . .

FROM base AS builder
RUN npm run build

FROM nginx:stable-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
