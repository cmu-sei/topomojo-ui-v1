#
#multi-stage target: dev
#
FROM node as dev
ARG commit
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN $(npm bin)/ng build --prod --output-path /app/dist
RUN sed -i s/##COMMIT##/"$commit"/ /app/dist/assets/config/settings.json
CMD ["npm", "start"]

#
#multi-stage target: prod
#
FROM dockreg.cwd.local/nginx-static
WORKDIR /var/www
COPY --from=dev /app/dist .
EXPOSE 80
