let app: any;
let initError: any = null;

async function loadApp() {
  try {
    const serverModule = await import("../server");
    app = serverModule.default || serverModule;
  } catch (err: any) {
    initError = {
      message: err.message,
      stack: err.stack,
      name: err.name
    };
  }
}

const loadPromise = loadApp();

export default async function (req: any, res: any) {
  await loadPromise;
  
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
