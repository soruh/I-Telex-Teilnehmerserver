# Use an official node (current lts) runtime as a parent image
FROM node:10.13.0 

# Set the working directory to /app
WORKDIR /app

# Copy all needed files to the container at /app

COPY src /app/src
RUN find /app/src -iname \*.ts -exec rm {} +

#COPY tools/createDb.js /app/tools/
COPY ecosystem.config.js /app
#COPY tables.sql /app
COPY package.json /app
COPY package-lock.json /app

COPY LICENSE /app


# # install up-to-date versions of node-gyp and node-pre-gyp
#RUN npm install node-gyp -g
#RUN npm install node-pre-gyp -g

# Install any needed packages specified in package.json
RUN npm install

# Install pm2
RUN npm install pm2 -g

# # remove node-gyp and node-pre-gyp again since they are no longer needed
#RUN npm remove node-gyp -g
#RUN npm remove node-pre-gyp -g

# start all processes
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
