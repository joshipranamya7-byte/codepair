FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV PORT=1234
EXPOSE 1234
CMD ["npm", "start"]
