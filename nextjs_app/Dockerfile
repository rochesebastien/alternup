# node js image (in LTS version)
FROM node:lts-alpine

WORKDIR /nextjs_app

# copy package.json and package-lock.json before all the project to install new dependencies only if they changed
COPY package.json package-lock.json ./

# install node dependencies
RUN npm install

# copy nextjs
COPY . .

# build nextjs app
RUN npm run build

# expose the port 
EXPOSE 3000

# start the app
CMD ["npm", "start"]