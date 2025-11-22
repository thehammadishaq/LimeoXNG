from fastapi import APIRouter, HTTPException
from services.finnhub.profile_service import FINNHUB_API_KEY, BASE_URL
import requests

router = APIRouter(prefix="/finnhub", tags=["Finnhub Test"])

@router.get("/test-api-key")
async def test_api_key():
    """Test if API key is working and has premium access"""
    if not FINNHUB_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    # Test with Premium endpoint
    test_url = f"{BASE_URL}/stock/profile"
    params = {"symbol": "AAPL", "token": FINNHUB_API_KEY}
    
    try:
        response = requests.get(test_url, params=params, timeout=10)
        
        result = {
            "api_key": f"{FINNHUB_API_KEY[:5]}...{FINNHUB_API_KEY[-5:]}",
            "api_key_length": len(FINNHUB_API_KEY),
            "endpoint": test_url,
            "status_code": response.status_code,
            "response": {}
        }
        
        if response.status_code == 200:
            result["response"] = response.json()
            result["message"] = "✅ API key is working and has Premium access!"
        else:
            try:
                result["response"] = response.json()
            except:
                result["response"] = {"error": response.text}
            result["message"] = f"❌ API returned status {response.status_code}"
            
            if response.status_code == 403:
                result["suggestion"] = "Your API key may not have Premium access. Please check your Finnhub account."
            elif response.status_code == 401:
                result["suggestion"] = "Invalid API key. Please verify your API key in .env file."
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing API: {str(e)}")

