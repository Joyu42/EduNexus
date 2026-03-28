module.exports = {
  apps: [
    {
      name: "edunexus-preview",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3012
      }
    }
  ]
};