WORKDIRnode_modules
npm-debug.log
Dockerfile
.dockerignore /app 
COPY package*.json ./ 
RUN npm install 
COPY . . 
EXPOSE 5000 
CMD ["node", "server.js"] 