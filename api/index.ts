let app: any;
let initError: any = null;

try {
  // Use dynamic require/import to catch initialization errors
  const serverModule = require("../server");
  app = serverModule.default || serverModule;
} catch (err: any) {
  initError = {
    message: err.message,
    stack: err.stack,
    name: err.name
  };
}

export default function (req: any, res: any) {
  if (initError) {
    res.status(500).json({
      error: "Initialization Error",
      details: initError.message,
      stack: initError.stack
    });
    return;
  }
  
  if (app) {
    return app(req, res);
  }
  
  res.status(500).json({ error: "App not initialized" });
}
