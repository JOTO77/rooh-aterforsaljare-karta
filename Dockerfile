# Hitta återförsäljare – webbapp i en container.
# Steg 1 bygger site/aterforsaljare.json från data/aterforsaljare.csv (nya adresser slås upp i OpenStreetMap).
# Steg 2 serverar den statiska sidan med nginx på port 8080.
#
#   docker build -t rooh-aterforsaljare .
#   docker run -d -p 8080:8080 --name rooh-aterforsaljare rooh-aterforsaljare
#   → http://localhost:8080

FROM node:22-alpine AS bygg
WORKDIR /app
COPY scripts/bygg.mjs scripts/
COPY data/ data/
COPY site/ site/
RUN node scripts/bygg.mjs

FROM nginxinc/nginx-unprivileged:1.27-alpine
LABEL org.opencontainers.image.source="https://github.com/JOTO77/rooh-aterforsaljare-karta"
LABEL org.opencontainers.image.description="Hitta återförsäljare – karta för rooh.se"
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=bygg /app/site/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/halsa || exit 1
