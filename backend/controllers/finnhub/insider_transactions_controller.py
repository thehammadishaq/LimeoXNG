from datetime import date
from fastapi import HTTPException, status
from typing import Optional, List, Dict

from services.finnhub.insider_transactions_service import get_insider_transactions
from services.insider_transactions_service import InsiderTransactionsService
from models.finnhub.insider_transactions import (
    InsiderTransactionsFetchResponse,
    InsiderTransactionItem,
)


class InsiderTransactionsController:
    """Controller for Insider Transactions operations."""

    async def fetch_insider_transactions(
        self,
        symbol: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: Optional[int] = None,
    ) -> Optional[Dict]:
        """
        Fetch insider transactions from Finnhub /stock/insider-transactions.
        """
        try:
            data = await get_insider_transactions(symbol, from_date, to_date, limit)
            return data
        except Exception as e:
            print(f"❌ Error fetching insider transactions from Finnhub: {e}")
            return None


async def fetch_insider_transactions_get(
    symbol: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: Optional[int] = None,
    save_to_db: bool = True,
) -> InsiderTransactionsFetchResponse:
    symbol_upper = symbol.upper().strip() if symbol else None

    print(
        f"Received request to fetch insider transactions from Finnhub (GET), "
        f"symbol={symbol_upper or 'latest'}, from={from_date}, to={to_date}, limit={limit}"
    )

    try:
        controller = InsiderTransactionsController()
        transactions_data = await controller.fetch_insider_transactions(
            symbol_upper, from_date, to_date, limit
        )

        if not transactions_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No insider transactions found for symbol '{symbol_upper or 'latest'}' "
                    f"from Finnhub."
                ),
            )

        data_list = transactions_data.get("data", [])
        response_symbol = transactions_data.get("symbol", symbol_upper or "")

        if not data_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No insider transactions data found for symbol '{response_symbol}' "
                    f"from Finnhub."
                ),
            )

        print(f"💾 save_to_db parameter: {save_to_db}")
        if save_to_db:
            print(
                f"💾 Attempting to save insider transactions for {response_symbol} to database..."
            )
            try:
                # Use InsiderTransactionsService to save each transaction as a separate document
                transactions_service = InsiderTransactionsService()
                saved_count = await transactions_service.save_transactions(
                    response_symbol, data_list
                )
                print(
                    f"✅ Saved {saved_count} insider transactions to database for symbol {response_symbol}"
                )
            except Exception as db_error:
                print(
                    f"❌ Error saving insider transactions to database for {response_symbol}: {db_error}"
                )
                print(f"   Error type: {type(db_error).__name__}")
                import traceback

                print(f"   Traceback: {traceback.format_exc()}")
        else:
            print(
                f"⏭️ Skipping database save for insider transactions of {response_symbol} (save_to_db=False)"
            )

        # Convert to InsiderTransactionItem models for response
        transactions: List[InsiderTransactionItem] = []
        for transaction in data_list:
            try:
                # Ensure symbol is included in each transaction
                if "symbol" not in transaction:
                    transaction["symbol"] = response_symbol
                # Coerce numeric fields safely before model validation
                raw_share = transaction.get("share")
                raw_change = transaction.get("change")
                raw_price = transaction.get("transactionPrice")

                try:
                    transaction["share"] = int(raw_share) if raw_share is not None else 0
                except (TypeError, ValueError):
                    transaction["share"] = 0

                try:
                    transaction["change"] = (
                        int(raw_change) if raw_change is not None else 0
                    )
                except (TypeError, ValueError):
                    transaction["change"] = 0

                try:
                    transaction["transactionPrice"] = (
                        float(raw_price) if raw_price is not None else 0.0
                    )
                except (TypeError, ValueError):
                    transaction["transactionPrice"] = 0.0

                transactions.append(InsiderTransactionItem(**transaction))
            except Exception as e:
                print(f"⚠️ Error parsing insider transaction: {e}")
                print(f"   Transaction data: {transaction}")
                # Fallback: map fields manually with safe defaults
                transactions.append(
                    InsiderTransactionItem(
                        name=transaction.get("name", ""),
                        share=int(transaction.get("share") or 0),
                        change=int(transaction.get("change") or 0),
                        filingDate=transaction.get("filingDate", ""),
                        transactionDate=transaction.get("transactionDate", ""),
                        transactionCode=transaction.get("transactionCode", ""),
                        transactionPrice=float(
                            transaction.get("transactionPrice") or 0.0
                        ),
                        symbol=transaction.get("symbol", response_symbol),
                    )
                )

        return InsiderTransactionsFetchResponse(
            symbol=response_symbol,
            from_date=from_date.isoformat() if from_date else None,
            to_date=to_date.isoformat() if to_date else None,
            limit=limit,
            data=transactions,
            saved_to_db=save_to_db,
            total_transactions=len(transactions),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in insider transactions controller for symbol {symbol_upper or 'latest'}: {e}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching insider transactions from Finnhub: {e}",
        )

