from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

# Instantiate Jinja2Templates with the 'templates' directory
templates = Jinja2Templates(directory="Website/templates")

router = APIRouter()

@router.get("/")
@router.get("/predictor")
def get_predictor_page(request: Request):
    """
    By default, the home route '/' and '/predictor' 
    render the same page (predictor.html).
    """
    return templates.TemplateResponse("predictor.html", {
        "request": request, 
        "current_page": "predictor"
    })


@router.get("/analytics")
def get_analytics_page(request: Request):
    """
    Renders the analytics.html
    """
    return templates.TemplateResponse("analytics.html", {
        "request": request, 
        "current_page": "analytics"
    })

@router.get("/about")
def get_about_page(request: Request):
    """
    Renders the about.html
    """
    return templates.TemplateResponse("about.html", {
        "request": request, 
        "current_page": "about"
    })

@router.get("/recommender")
def get_recommender_page(request: Request):
    """
    Example: Renders recommender.html 
    """
    return templates.TemplateResponse("recommender.html", {
        "request": request, 
        "current_page": "recommender"
    })

# @router.get("/route5")
# def get_route5_page(request: Request):
#     """
#     Example: Renders route5.html
#     """
#     return templates.TemplateResponse("route5.html", {
#         "request": request, 
#         "current_page": "route5"
#     })
