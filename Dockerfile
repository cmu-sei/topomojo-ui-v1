#
#multi-stage target: dev
#
FROM node as dev
ARG commit
WORKDIR /app
COPY package.json package-lock.json tools/ ./
RUN npm install && \
    sh fixup-wmks.sh
COPY . .
RUN if [ -e "wmks.tar" ]; then tar xf wmks.tar -C node_modules/vmware-wmks; fi
RUN $(npm bin)/ng build --prod --output-path /app/dist && \
    sed -i s/##COMMIT##/"$commit"/ /app/dist/assets/config/settings.json
CMD ["npm", "start"]

#
#multi-stage target: prod
#
FROM nginx:alpine
WORKDIR /var/www
COPY --from=dev /app/dist .
COPY --from=dev /app/LICENSE.md ./LICENSE.md
COPY --from=dev /app/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=dev /app/nginx-basehref.sh /docker-entrypoint.d/90-basehref.sh
RUN chmod +x /docker-entrypoint.d/90-basehref.sh
EXPOSE 80
