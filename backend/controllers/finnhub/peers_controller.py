from fastapi import HTTPException, status
from typing import Optional, List
from services.finnhub.peers_service import get_company_peers
from models.finnhub.peers import PeersFetchResponse


class PeersController:
    """Controller for Company Peers operations"""

    async def fetch_peers(self, symbol: str, grouping: str = "subIndustry") -> Optional[List[str]]:
        """
        Fetch company peers from Finnhub
        """
        try:
            data = await get_company_peers(symbol.upper(), grouping)
            return data
        except Exception as e:
            print(f"❌ Error fetching peers from Finnhub: {e}")
            return None


async def fetch_peers_get(symbol: str, grouping: str = "subIndustry"):
    symbol = symbol.upper()

    print(f"Received request to fetch peers for {symbol} from Finnhub (GET)")
    print(f"   Grouping: {grouping}")

    try:
        controller = PeersController()
        peers_data = await controller.fetch_peers(symbol, grouping)

        if peers_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No peers data found for {symbol} from Finnhub."
            )

        return PeersFetchResponse(
            symbol=symbol,
            peers=peers_data,
            grouping=grouping,
            count=len(peers_data)
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching peers from Finnhub: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching peers from Finnhub: {e}"
        )

