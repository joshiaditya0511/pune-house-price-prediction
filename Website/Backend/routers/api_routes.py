from fastapi import APIRouter

router = APIRouter()

@router.get("/charts")
def get_charts_data():
    """
    Placeholder API for chart-related data
    """
    return {"message": "Charts data placeholder"}

@router.get("/models")
def get_models_data():
    """
    Placeholder API for model-related data
    """
    return {"message": "Models data placeholder"}
