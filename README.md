How to use this script to setup a DoH server:

1. login to your cloudflare account.
2. navigate to Workers & Pages
3. click on Create application and create a new hello world application.
4. choose a name for your worker and click deploy
5. once deployed click on your worker, and then click on edit code
6. paste the JS code in this repo and deploy.
7. now navigate to settings tab and create these 4 variables in "Variable and Secrets" section:
   CACHE_TTL_DEFAULT => 30
   CACHE_TTL_MAX => 60
   CACHE_TTL_MIN => 10
   UPSTREAMM_DOH => https://1.1.1.1/dns-query
8. now the DoH server worker is ready, you just need to copy its url and paste it where you can define DoH servers e.g. Routers... 
