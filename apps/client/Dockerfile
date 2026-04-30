FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
RUN npm ci
RUN npm run build --workspace=@easy-update/client

FROM nginx:stable-alpine
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
