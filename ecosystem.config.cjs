module.exports = {
  apps: [
    {
      name: "smartbill_server",
      script: "./dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      }
    },
    {
      name: "smartbill_invoice_worker",
      script: "./dist/workers/invoiceWorker.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
