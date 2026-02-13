const path = require("path");
const root = __dirname;

module.exports = {
  apps: [
    {
      name: "node-reg-api",
      cwd: path.join(root, "packages/api"),
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "node-reg-web",
      cwd: path.join(root, "packages/web"),
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3001",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "http://localhost:3002",
      },
    },
  ],
};
