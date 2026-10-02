FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN ffmpeg -version

COPY . .

EXPOSE 5000

CMD ["npm", "start"]