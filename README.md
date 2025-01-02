# School Management System API - Deployment Instructions

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)
- Docker Engine

## Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone git@github.com:salmoor/soar.git
   cd soar
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   NODE_ENV=development
   SERVICE_NAME=school-management
   USER_PORT=5111
   ADMIN_PORT=5222
   
   # MongoDB
   MONGO_URI=mongodb://localhost:27017/school-management
   
   # Redis
   REDIS_URI=redis://localhost:6379
   CORTEX_REDIS=redis://localhost:6379
   CACHE_REDIS=redis://localhost:6379
   
   # Prefixes
   CORTEX_PREFIX=school-management
   CACHE_PREFIX=school-management
   
   # Security
   LONG_TOKEN_SECRET=long-token-secret
   SHORT_TOKEN_SECRET=short-token-secret
   NACL_SECRET=nacl-secret
   ```

   Secrets can be generated by running `openssl rand -base64 32`

4. **Start MongoDB using Docker**
   ```bash
   docker compose up -d mongodb
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5111`

## Production Deployment (Current Setup)

1. **Server Setup**
   - Ubuntu 20.04 LTS
   - Node.js v20.16
   - Nginx as reverse proxy
   - MongoDB via Docker Container
   - Redis via Docker Container
   - PM2 for process management

2. **Software Installation**

   a. Install Node.js and npm:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

   b. Install PM2:
   ```bash
   npm install -g pm2
   ```

   c. Clone and setup the application:
   ```bash
   git clone git@github.com:salmoor/soar.git
   cd soar
   npm install
   mkdir -p /var/www/soar
   cp -r * /var/www/soar
   chgroup -R www-data /var/www/soar
   ```

   d. Create production environment file:
   ```bash
   vim /var/www/soar/.env   # Edit with production values
   ```

3. **Configure Nginx**

   Create an Nginx configuration file:
   ```nginx
   server {
       listen 80;
       server_name soar.alemsalmoor.com;

       location / {
           proxy_pass http://localhost:5111;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Save the configuration file as `/etc/nginx/sites-available/soar.alemsalmoor.com` and enable it:
   ```bash
   sudo ln -s /etc/nginx/sites-available/soar.alemsalmoor.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Setup SSL**
   ```bash
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   sudo certbot --nginx -d soar.alemsalmoor.com
   ```

5. **Start MongoDB and Redis using Docker**
   ```bash
   docker run -d --name mongodb --restart unless-stopped -p 127.0.0.1:27017:27017 -v /mongodb_data:/data/db mongo:latest
   docker run -d --name redis --restart unless-stopped -p 127.0.0.1:6379:6379 -v /redis_data:/data/redis redis:latest
   ```

6. **Start the Application**
   ```bash
   cd /var/www/soar
   pm2 start index.js --name "soar"
   pm2 save
   ```

7. **Setup PM2 Startup Script**
   ```bash
   pm2 startup systemd
   ```

## Monitoring and Maintenance

1. **View Logs**
   ```bash
   # View PM2 logs
   pm2 logs soar

   # View Nginx logs
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Monitor Application**
   ```bash
   pm2 monit
   ```

3. **Update Application**
   ```bash
   cd /soar
   git pull
   npm install
   cp -R * /var/www/soar
   pm2 restart soar
   ```

## Security Considerations

1. **Firewall Configuration**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. **HTTPS**
   - SSL certificates are provided by Let's Encrypt
   - Nginx is configured to use HTTPS
   - Nginx is configured to redirect HTTP to https

3. **Rate Limiting**
   - The application includes built-in rate limiting via `__rateLimit.mw.js` middleware

