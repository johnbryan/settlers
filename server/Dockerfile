# https://hub.docker.com/_/node
FROM node:12

# Create and change to the app directory.
WORKDIR /usr/src/app
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup. Dont need 8080?
EXPOSE 8080
EXPOSE 5005
CMD [ "npm", "start" ]
