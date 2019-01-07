# Use an official node runtime as a parent image
FROM node:10.13.0

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app


# delete existing logs
RUN rm -rf logs

# delete existing database
RUN rm -rf db

# delete existing node_modules
RUN rm -rf node_modules

# install up-to-date versions of node-gyp and node-pre-gyp
RUN npm install node-gyp -g
RUN npm install node-pre-gyp -g

# Install any needed packages specified in package.json
RUN npm install

# Install pm2
RUN npm install pm2 -g

# expose needed Ports
EXPOSE 11812
EXPOSE 11811
EXPOSE 3030

# remove node-gyp and node-pre-gyp again since they are no longer needed
RUN npm remove node-gyp -g
RUN npm remove node-pre-gyp -g



# start all processes
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
