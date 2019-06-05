#
#multi-stage target: dev
#
FROM node as dev
ARG commit
WORKDIR /app
COPY package.json package-lock.json tools/ ./
RUN npm install && \
    node fixup-wmks.js
COPY . .
RUN $(npm bin)/ng build --prod --output-path /app/dist && \
    sed -i s/##COMMIT##/"$commit"/ /app/dist/assets/config/settings.json
CMD ["npm", "start"]

#
#multi-stage target: prod
#
FROM nginx:alpine
WORKDIR /var/www
COPY --from=dev /app/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=dev /app/dist .
EXPOSE 80
