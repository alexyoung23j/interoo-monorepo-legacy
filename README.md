# Creating Migrations

Whenever you edit `schema.prisma` you MUST run `pnpm create-migration <name of migration>` from root. This will apply the migration to the remote dev database. When you deploy to Railway, `migrate deploy` will be run as part of the deploy script, which will then apply the migration to the production db.



# NGROK SETUP

To test the app on mobile devices while developing locally, we use ngrok to create secure tunnels. Here's how to set it up:

1. Install ngrok in the server project:
   ```
   cd server
   pnpm install --save-dev ngrok concurrently pino-pretty
   ```

2. Create ngrok config file (for macOS):
   ```
   mkdir -p "$HOME/Library/Application Support/ngrok" && echo 'version: "2"
   tunnels:
     FRONTEND_URL:
       addr: 3000
       proto: http
     BACKEND_URL:
       addr: 8800
       proto: http' > "$HOME/Library/Application Support/ngrok/ngrok.yml"
   ```

3. Start the development environment:
   ```
   # Terminal 1: Start server + ngrok tunnels
   cd server
   pnpm dev:mobile
   ```

4. Look for the ngrok URLs in Terminal 1's output:
   ```
   FRONTEND_URL: https://xxxx-xxxx.ngrok-free.app -> http://localhost:3000
   BACKEND_URL: https://yyyy-yyyy.ngrok-free.app -> http://localhost:8800
   ```

5. Update the NEXT_PUBLIC_BACKEND_URL in .env to use the BACKEND_URL there. You will switch this back to http://localhost:8800 whenever not using ngrok.

5. Run the frontend normally. Grab the FRONTEND_URL from the ngrok output (remember this is in the server outputs), which is the base url for the app (like localhost:3000). You can now copy 
paste that into a mobile device (usually along with /study/<studyId>) and run it on the mobile device. 

Note: You'll need a free ngrok account and to be logged in (`ngrok config add-authtoken YOUR_TOKEN`).