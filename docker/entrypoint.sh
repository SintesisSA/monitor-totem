#!/bin/sh

# Default value for BASE_CONTEXT if not set
BASE_CONTEXT=${BASE_CONTEXT:-/}

# Replace <base href="/"> with actual base href value in index.html
sed -i "s|<base href=\"/\">|<base href=\"${BASE_CONTEXT}\">|g" /usr/share/nginx/html/index.html

# Modify Nginx configuration if BASE_CONTEXT is not "/"
if [ "$BASE_CONTEXT" != "/" ]; then
  sed -i "s|#__REWRITE__|rewrite ^${BASE_CONTEXT}(.*)\\\$ /\\\$1 break;|" /etc/nginx/conf.d/default.conf
else
  sed -i "s|#__REWRITE__||" /etc/nginx/conf.d/default.conf
fi

# Load environments
envsubst < /usr/share/nginx/html/assets/env.sample.js > /usr/share/nginx/html/assets/env.js

# Start Nginx
nginx -g "daemon off;"
