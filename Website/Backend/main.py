from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routers import ui_routes, api_routes

def create_app() -> FastAPI:
    """Create and configure the main FastAPI app."""
    app = FastAPI()

    # Mount the static directory
    app.mount("/static", StaticFiles(directory="Website/static"), name="static")

    print('static files mounted')

    # Include Routers
    app.include_router(api_routes.router, prefix="/api")
    print('api router included')
    app.include_router(ui_routes.router)

    return app

app = create_app()
