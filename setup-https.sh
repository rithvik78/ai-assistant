#!/bin/bash

# Complete script to enable HTTPS on your EC2 instance
# Run this on your EC2 instance

echo "Setting up HTTPS for your AI Assistant API..."

# Update system
sudo apt update

# Install Nginx
echo "Installing Nginx..."
sudo apt install nginx -y

# Install Certbot (for Let's Encrypt SSL)
echo "Installing Certbot..."
sudo apt install certbot python3-certbot-nginx -y

# Create Nginx configuration
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/ai-assistant > /dev/null <<EOF
server {
    listen 80;
    server_name 3.131.93.145;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name 3.131.93.145;
    
    # SSL Configuration (self-signed for IP address)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        add_header Content-Type text/plain;
        add_header Content-Length 0;
        return 200;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS for proxied requests
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin "*" always;
    }
}
EOF

# Create self-signed SSL certificate
echo "Creating self-signed SSL certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=3.131.93.145"

# Enable the site
echo "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/ai-assistant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid!"
    
    # Start and enable Nginx
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    
    echo ""
    echo "HTTPS setup complete!"
    echo ""
    echo "Your API is now available at: https://3.131.93.145"
    echo "Update your VITE_API_URL in Vercel to: https://3.131.93.145"
    echo ""
    echo "Make sure your EC2 Security Group allows:"
    echo "   - Port 80 (HTTP) from 0.0.0.0/0"
    echo "   - Port 443 (HTTPS) from 0.0.0.0/0"
    echo "   - Port 8000 should only be accessible from localhost (127.0.0.1)"
    echo ""
    echo "Test with: curl -k https://3.131.93.145/api/health"
    
else
    echo "ERROR: Nginx configuration has errors. Please check the configuration."
    exit 1
fi