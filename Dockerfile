FROM alpine:3.23 AS build
WORKDIR /app

RUN apk upgrade --no-cache \
    && apk add --no-cache nodejs npm \
    && npm install --global npm@12.0.2 \
    && install -d /usr/local/lib/node_modules \
    && cp -a /usr/lib/node_modules/npm /tmp/npm \
    && apk del npm \
    && mv /tmp/npm /usr/local/lib/node_modules/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && node /usr/local/lib/node_modules/npm/bin/npm-cli.js cache clean --force

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
RUN test -n "$VITE_API_URL" && npm run build

FROM alpine:3.23 AS final

RUN apk upgrade --no-cache \
    && apk add --no-cache nginx \
    && install -d -o nginx -g nginx \
        /tmp/client_temp \
        /tmp/proxy_temp \
        /tmp/fastcgi_temp \
        /tmp/uwsgi_temp \
        /tmp/scgi_temp

COPY ops/nginx/nginx.conf /etc/nginx/nginx.conf
COPY ops/nginx/default.conf /etc/nginx/http.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["nginx", "-g", "daemon off;"]
